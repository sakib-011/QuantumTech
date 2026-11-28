package com.quantumtech.backend.service;

import com.quantumtech.backend.config.OrderIndexInitializer;
import com.quantumtech.backend.dto.CartLine;
import com.quantumtech.backend.dto.CartQuote;
import com.quantumtech.backend.dto.CampaignAnalyticsRequest;
import com.quantumtech.backend.dto.CouponValidationRequest;
import com.quantumtech.backend.dto.CreateOrderRequest;
import com.quantumtech.backend.dto.OrderStatusRequest;
import com.quantumtech.backend.dto.Phone;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.*;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.service.StockService.Reservation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Guest checkout, order tracking and the admin order lifecycle.
 *
 * <p>Checkout pipeline: validate request, then price the cart server-side ({@link CartService}),
 * then reserve stock atomically ({@link StockService}), then allocate an order number, then insert.
 * Any failure after reservation releases the reserved stock again.
 */
@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final int MAX_ORDER_NUMBER_ATTEMPTS = 5;
    static final String TRX_ID_PATTERN = "[A-Za-z0-9]{8,12}";

    private final OrderRepository orders;
    private final ProductRepository products;
    private final CartService cart;
    private final StockService stock;
    private final OrderNumberGenerator orderNumbers;
    private final PaymentMethodCatalog paymentMethods;
    private final LookupRateLimiter lookupLimiter;
    private final NotificationService notificationService;
    private final PromotionService promotions;
    private final MongoTemplate mongo;

    public OrderService(OrderRepository orders, ProductRepository products, CartService cart,
                        StockService stock, OrderNumberGenerator orderNumbers,
                        PaymentMethodCatalog paymentMethods, LookupRateLimiter lookupLimiter,
                        NotificationService notificationService, MongoTemplate mongo,
                        PromotionService promotions) {
        this.orders = orders;
        this.products = products;
        this.cart = cart;
        this.stock = stock;
        this.orderNumbers = orderNumbers;
        this.paymentMethods = paymentMethods;
        this.lookupLimiter = lookupLimiter;
        this.notificationService = notificationService;
        this.mongo = mongo;
        this.promotions = promotions;
    }

    // ------------------------------------------------------------------ admin queries

    public List<Order> list(String status, String paymentMethod, String search) {
        return list(status, paymentMethod, null, search);
    }

    public List<Order> list(String status, String paymentMethod, String paymentStatus, String search) {
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String phoneTerm = term.replaceAll("[\\s-]", "");
        return orders.findAll().stream()
                .filter(o -> isBlank(status) || status.equals(o.getStatus()))
                .filter(o -> isBlank(paymentMethod) || paymentMethod.equals(o.getPaymentMethod()))
                .filter(o -> isBlank(paymentStatus) || paymentStatus.equals(o.getPaymentStatus()))
                .filter(o -> term.isEmpty()
                        || contains(o.getOrderNumber(), term)
                        || (!phoneTerm.isEmpty() && o.getPhone() != null && o.getPhone().contains(phoneTerm))
                        || contains(o.getCustomerName(), term)
                        || contains(o.getTrxId(), term))
                .sorted(Comparator.comparing(Order::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public Order getById(String id) {
        return orders.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public Order getByNumber(String number) {
        return orders.findByOrderNumberIgnoreCase(number)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    // ------------------------------------------------------------------ checkout

    public synchronized Order create(CreateOrderRequest request, String idempotencyKey) {
        return create(request, idempotencyKey, null);
    }

    public synchronized Order create(CreateOrderRequest request, String idempotencyKey, String customerId) {
        String key = normalizeIdempotencyKey(idempotencyKey);
        if (key != null) {
            Optional<Order> existing = orders.findByIdempotencyKey(key);
            if (existing.isPresent()) return existing.get();
        }

        String method = request.paymentMethod();
        if (!PaymentMethod.isValid(method)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid payment method");
        }
        if (!paymentMethods.isAvailable(method)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    method + " payment is not available right now. Please choose another payment method.",
                    Map.of("code", "PAYMENT_METHOD_UNAVAILABLE"));
        }
        String phone = Phone.normalize(request.phone());
        if (!Phone.isValid(phone)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, Phone.MESSAGE);
        }

        String trxId = null;
        String senderNumber = null;
        if (PaymentMethod.isMobileWallet(method)) {
            trxId = request.trxId() == null ? null : request.trxId().trim().toUpperCase(Locale.ROOT);
            senderNumber = Phone.normalize(request.senderNumber());
            if (trxId == null || !trxId.matches(TRX_ID_PATTERN) || !Phone.isValid(senderNumber)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Valid TrxID and sender number are required",
                        Map.of("code", "PAYMENT_DETAILS_INVALID"));
            }
            ensureTrxIdUnused(trxId);
        }

        CartQuote quote = cart.quote(request.items(), request.area());
        if (!quote.valid()) {
            throw new ApiException(HttpStatus.CONFLICT, quote.issues().get(0),
                    Map.of("code", "CART_INVALID", "cart", quote));
        }
        PromotionService.CouponValidationResult coupon = isBlank(request.couponCode())
                ? null : validateCoupon(request.couponCode(), phone, quote);
        int couponDiscount = coupon == null ? 0 : (int) Math.round(coupon.discountAmount());
        int total = Math.max(0, quote.total() - couponDiscount);
        if (request.total() != null && request.total() != total) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Prices or discounts have changed. Please review your order total of " + total + " BDT.",
                    Map.of("code", "PRICE_CHANGED", "cart", quote));
        }

        List<Reservation> reserved = reserveStock(quote);
        Order saved;
        try {
            Order order = buildOrder(request, quote, phone, trxId, senderNumber, key,
                    coupon == null ? null : coupon.coupon().getCode(), couponDiscount, customerId);
            saved = insertWithOrderNumber(order);
        } catch (DuplicateKeyException ex) {
            stock.releaseAll(reserved);
            String message = String.valueOf(ex.getMessage());
            if (key != null && message.contains(OrderIndexInitializer.IDEMPOTENCY_INDEX)) {
                return orders.findByIdempotencyKey(key).orElseThrow(() -> ex);
            }
            if (message.contains(OrderIndexInitializer.TRX_ID_INDEX)) throw trxIdUsed();
            throw ex;
        } catch (RuntimeException ex) {
            stock.releaseAll(reserved);
            throw ex;
        }
        recordPromotionEvents(saved, coupon, phone, couponDiscount);
        notifyOwnerSafely(saved);
        return saved;
    }

    private void recordPromotionEvents(Order order, PromotionService.CouponValidationResult coupon,
                                       String phone, int couponDiscount) {
        if (coupon != null) {
            try {
                promotions.recordCouponUsage(coupon.coupon().getCode(), phone,
                        order.getOrderNumber(), couponDiscount);
                promotions.track(new CampaignAnalyticsRequest(null, null, "coupon_applied",
                        null, coupon.coupon().getCode(), order.getOrderNumber(),
                        (double) couponDiscount, "/checkout"));
            } catch (RuntimeException ex) {
                log.error("Order {} was placed but coupon usage could not be recorded",
                        order.getOrderNumber(), ex);
            }
        }
        try {
            promotions.track(new CampaignAnalyticsRequest(null, null, "order_completed",
                    null, order.getCouponCode(), order.getOrderNumber(),
                    (double) order.getTotal(), "/checkout"));
        } catch (RuntimeException ex) {
            log.error("Order {} was placed but campaign analytics could not be recorded",
                    order.getOrderNumber(), ex);
        }
    }

    private List<Reservation> reserveStock(CartQuote quote) {
        List<Reservation> reserved = new ArrayList<>();
        for (CartLine line : quote.items()) {
            Reservation reservation = new Reservation(line.productId(), line.variantId(), line.quantity());
            if (!stock.reserve(reservation)) {
                stock.releaseAll(reserved);
                String name = line.variantName() == null ? line.productName()
                        : line.productName() + " (" + line.variantName() + ")";
                throw new ApiException(HttpStatus.CONFLICT,
                        name + " just went out of stock. Please review your cart.",
                        Map.of("code", "OUT_OF_STOCK"));
            }
            reserved.add(reservation);
        }
        return reserved;
    }

    private Order buildOrder(CreateOrderRequest request, CartQuote quote, String phone,
                             String trxId, String senderNumber, String key,
                             String couponCode, int couponDiscount, String customerId) {
        Instant now = Instant.now();
        Order order = new Order();
        order.setId(UUID.randomUUID().toString());
        order.setCustomerId(customerId);
        order.setCustomerName(request.customerName().trim());
        order.setPhone(phone);
        order.setArea(request.area());
        order.setAddress(request.address().trim());
        order.setNote(isBlank(request.note()) ? null : request.note().trim());
        order.setSubtotal(quote.subtotal());
        int promotionalSavings = quote.items().stream()
                .mapToInt(line -> line.discountAmount() * line.quantity()).sum();
        order.setPromotionalDiscount(promotionalSavings > 0 ? promotionalSavings : null);
        order.setCouponCode(couponCode);
        order.setCouponDiscount(couponDiscount > 0 ? couponDiscount : null);
        order.setDeliveryCharge(quote.deliveryCharge());
        order.setTotal(Math.max(0, quote.total() - couponDiscount));
        order.setPaymentMethod(request.paymentMethod());
        boolean wallet = PaymentMethod.isMobileWallet(request.paymentMethod());
        order.setPaymentStatus(wallet ? PaymentStatus.VERIFICATION_PENDING : PaymentStatus.PENDING_COLLECTION);
        order.setTrxId(trxId);
        order.setSenderNumber(senderNumber);
        order.setPaymentTrxId(trxId);
        order.setPaymentSender(senderNumber);
        order.setStatus(OrderStatus.PENDING);
        order.setSource(isBlank(request.source()) ? null : request.source().trim());
        order.setLanguage(request.language() == null ? "en" : request.language());
        order.setNotificationStatus("Pending");
        order.setIdempotencyKey(key);
        order.setCreatedAt(now);
        order.setUpdatedAt(now);

        List<OrderItem> items = new ArrayList<>();
        for (CartLine line : quote.items()) {
            OrderItem item = new OrderItem();
            item.setId(UUID.randomUUID().toString());
            item.setOrderId(order.getId());
            item.setProductId(line.productId());
            item.setVariantId(line.variantId());
            item.setProductName(line.productName());
            item.setVariantName(line.variantName());
            item.setUnitPrice(line.unitPrice());
            item.setOriginalPrice(line.originalPrice());
            item.setDiscountAmount(line.discountAmount());
            item.setAppliedDiscountId(line.appliedDiscountId());
            item.setQuantity(line.quantity());
            item.setLineTotal(line.lineTotal());
            item.setImage(line.image());
            items.add(item);
        }
        order.setItems(items);

        OrderStatusLog placed = new OrderStatusLog();
        placed.setId(UUID.randomUUID().toString());
        placed.setOrderId(order.getId());
        placed.setFromStatus(OrderStatus.PENDING);
        placed.setToStatus(OrderStatus.PENDING);
        placed.setChangedBy("Customer");
        placed.setChangedAt(now);
        placed.setNote("Order placed by customer via guest checkout (" + request.paymentMethod() + ").");
        order.setHistory(new ArrayList<>(List.of(placed)));
        return order;
    }

    private PromotionService.CouponValidationResult validateCoupon(
            String code, String phone, CartQuote quote) {
        PromotionService.CouponValidationResult result = promotions.validateCoupon(
                new CouponValidationRequest(code, phone, quote.items().stream()
                        .filter(CartLine::isOk)
                        .map(line -> new CouponValidationRequest.CartLine(
                                line.productId(), line.categoryId(), line.lineTotal()))
                        .toList()));
        if (!result.valid()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, result.error(),
                    Map.of("code", "COUPON_INVALID"));
        }
        return result;
    }

    /** Retries with a fresh number if an order number collides (e.g. with legacy numbering). */
    private Order insertWithOrderNumber(Order order) {
        for (int attempt = 1; ; attempt++) {
            order.setOrderNumber(orderNumbers.next());
            try {
                return orders.insert(order);
            } catch (DuplicateKeyException ex) {
                boolean numberClash = String.valueOf(ex.getMessage())
                        .contains(OrderIndexInitializer.ORDER_NUMBER_INDEX);
                if (!numberClash || attempt >= MAX_ORDER_NUMBER_ATTEMPTS) throw ex;
                log.warn("Order number {} already exists, retrying", order.getOrderNumber());
            }
        }
    }

    private void notifyOwnerSafely(Order order) {
        try {
            notificationService.notifyOwner(order);
        } catch (RuntimeException ex) {
            // The order is already placed; a notification problem must not fail checkout.
            log.error("Could not schedule owner notification for order {}", order.getOrderNumber(), ex);
        }
    }

    void ensureTrxIdUnused(String trxId) {
        if (orders.existsByTrxIdIgnoreCase(trxId)) throw trxIdUsed();
    }

    static ApiException trxIdUsed() {
        return new ApiException(HttpStatus.CONFLICT, "This TrxID has already been used",
                Map.of("code", "TRXID_USED"));
    }

    private static String normalizeIdempotencyKey(String key) {
        if (key == null || key.isBlank()) return null;
        String trimmed = key.trim();
        if (trimmed.length() > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "X-Idempotency-Key must be at most 100 characters");
        }
        return trimmed;
    }

    // ------------------------------------------------------------------ tracking

    /** Public lookup; both the order number and the phone used at checkout must match. */
    public Order track(String orderNumber, String phone, String clientKey) {
        lookupLimiter.check(clientKey);
        return findForCustomer(orderNumber, phone);
    }

    Order findForCustomer(String orderNumber, String phone) {
        ApiException notFound = new ApiException(HttpStatus.NOT_FOUND,
                "No order found matching this order number and phone");
        if (isBlank(orderNumber) || !Phone.isValid(phone)) throw notFound;
        String cleanPhone = Phone.normalize(phone);
        return orders.findByOrderNumberIgnoreCase(orderNumber.trim())
                .filter(o -> cleanPhone.equals(Phone.normalize(o.getPhone())))
                .orElseThrow(() -> notFound);
    }

    // ------------------------------------------------------------------ admin lifecycle

    public Order updateStatus(String id, OrderStatusRequest request) {
        Order order = getById(id);
        String from = order.getStatus();
        String to = request.status();
        String previousPaymentStatus = order.getPaymentStatus();

        if (OrderStatus.isFinal(from)) {
            throw new ApiException(HttpStatus.CONFLICT, "A final order status cannot be changed");
        }
        if (!OrderStatus.canTransition(from, to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid transition from " + from + " to " + to);
        }
        boolean wallet = PaymentMethod.isMobileWallet(order.getPaymentMethod());
        if (OrderStatus.CONFIRMED.equals(to) && wallet && !PaymentStatus.VERIFIED.equals(previousPaymentStatus)) {
            throw new ApiException(HttpStatus.CONFLICT, "bKash/Nagad payment must be Verified before confirmation");
        }

        String reason = null;
        if (OrderStatus.CANCELLED.equals(to)) {
            reason = !isBlank(request.reason()) ? request.reason() : request.note();
            if (isBlank(reason)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A cancellation reason is required");
            }
            order.setCancellationReason(reason.trim());
            if (wallet) {
                if (PaymentStatus.VERIFIED.equals(previousPaymentStatus)) {
                    order.setPaymentStatus(PaymentStatus.REFUND_PENDING);
                }
            } else {
                order.setPaymentStatus(PaymentStatus.CANCELLED);
            }
        }
        if (OrderStatus.DELIVERED.equals(to) && PaymentMethod.COD.equals(order.getPaymentMethod())) {
            order.setPaymentStatus(PaymentStatus.COLLECTED);
        }

        order.setStatus(to);
        order.setUpdatedAt(Instant.now());
        addHistory(order, from, to, "Admin",
                isBlank(request.note()) ? "Status changed to " + to : request.note().trim(), reason);
        Order saved = saveIfUnchanged(order, from, previousPaymentStatus);

        if (OrderStatus.CANCELLED.equals(to)) restoreStock(saved);
        return saved;
    }

    private void restoreStock(Order order) {
        List<Reservation> lines = Objects.requireNonNullElse(order.getItems(), List.<OrderItem>of()).stream()
                .map(i -> new Reservation(i.getProductId(), i.getVariantId(), i.getQuantity()))
                .toList();
        stock.releaseAll(lines);
    }

    /**
     * Compare-and-set save: writes the order only if nobody changed its status or payment status
     * since it was read, so two admins cannot e.g. cancel the same order twice (double restock).
     */
    Order saveIfUnchanged(Order order, String expectedStatus, String expectedPaymentStatus) {
        Query query = Query.query(Criteria.where("_id").is(order.getId())
                .and("status").is(expectedStatus)
                .and("paymentStatus").is(expectedPaymentStatus));
        Order previous = mongo.findAndReplace(query, order);
        if (previous == null) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "This order was updated by someone else. Refresh and try again.",
                    Map.of("code", "CONCURRENT_UPDATE"));
        }
        return order;
    }

    static void addHistory(Order order, String from, String to, String changedBy, String note, String reason) {
        List<OrderStatusLog> history = order.getHistory() == null
                ? new ArrayList<>() : new ArrayList<>(order.getHistory());
        OrderStatusLog entry = new OrderStatusLog();
        entry.setId(UUID.randomUUID().toString());
        entry.setOrderId(order.getId());
        entry.setFromStatus(from);
        entry.setToStatus(to);
        entry.setChangedBy(changedBy);
        entry.setChangedAt(Instant.now());
        entry.setNote(note != null ? note : reason);
        history.add(entry);
        order.setHistory(history);
    }

    public Map<String, Object> dashboard() {
        List<Order> all = orders.findAll();
        List<Product> productList = products.findAll();
        Map<String, Object> result = new HashMap<>();
        result.put("totalOrders", all.size());
        result.put("pendingOrders", all.stream().filter(o -> OrderStatus.PENDING.equals(o.getStatus())).count());
        result.put("deliveredOrders", all.stream().filter(o -> OrderStatus.DELIVERED.equals(o.getStatus())).count());
        result.put("paymentVerificationPending", all.stream()
                .filter(o -> OrderStatus.PENDING.equals(o.getStatus())
                        && PaymentStatus.VERIFICATION_PENDING.equals(o.getPaymentStatus())).count());
        result.put("refundPending", all.stream()
                .filter(o -> PaymentStatus.REFUND_PENDING.equals(o.getPaymentStatus())).count());
        result.put("totalProducts", productList.stream().filter(p -> !"Deleted".equals(p.getStatus())).count());
        result.put("lowStockProducts", productList.stream()
                .filter(p -> !"Deleted".equals(p.getStatus()) && p.getStock() <= 5).count());
        result.put("notificationFailed", all.stream()
                .filter(o -> "Failed".equals(o.getNotificationStatus())).count());
        result.put("totalRevenue", all.stream()
                .filter(o -> !OrderStatus.CANCELLED.equals(o.getStatus()))
                .mapToInt(Order::getTotal).sum());
        return result;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }
}
