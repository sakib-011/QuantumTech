package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CartQuote;
import com.quantumtech.backend.dto.CreateOrderRequest;
import com.quantumtech.backend.dto.OrderStatusRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.StoreSettings;
import com.quantumtech.backend.model.Coupon;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.repository.SettingsRepository;
import com.quantumtech.backend.service.StockService.Reservation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Duration;
import java.util.*;

import static com.quantumtech.backend.service.CheckoutFixtures.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.*;

class OrderServiceTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final SettingsRepository settings = mock(SettingsRepository.class);
    private final StockService stock = mock(StockService.class);
    private final OrderNumberGenerator numbers = mock(OrderNumberGenerator.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final PromotionService promotions = mock(PromotionService.class);
    private final Map<String, Product> catalog = new HashMap<>();
    private OrderService service;

    @BeforeEach
    void setUp() {
        when(settings.findById("store")).thenReturn(Optional.of(settingsWithWallets()));
        when(products.findAllById(any())).thenAnswer(inv -> {
            List<Product> found = new ArrayList<>();
            for (Object id : (Iterable<?>) inv.getArgument(0)) {
                if (catalog.containsKey(id)) found.add(catalog.get(id));
            }
            return found;
        });
        when(products.findById(anyString())).thenAnswer(inv -> Optional.ofNullable(catalog.get(inv.getArgument(0))));
        when(stock.reserve(any())).thenReturn(true);
        when(numbers.next()).thenReturn("QT-261123-0001", "QT-261123-0002", "QT-261123-0003");
        when(orders.insert(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mongo.findAndReplace(any(Query.class), any(Order.class))).thenAnswer(inv -> inv.getArgument(1));
        when(promotions.calculateProductPrice(any(Product.class), nullable(String.class))).thenAnswer(inv -> {
            Product product = inv.getArgument(0);
            String variantId = inv.getArgument(1);
            double basePrice = product.getPrice();
            if (variantId != null && product.getVariants() != null) {
                basePrice = product.getVariants().stream().filter(v -> variantId.equals(v.getId()))
                        .mapToDouble(v -> v.getPrice() > 0 ? v.getPrice() : product.getPrice())
                        .findFirst().orElse(basePrice);
            }
            if (product.getOldPrice() != null && product.getOldPrice() > basePrice) {
                return new PromotionService.PriceResult(product.getOldPrice(), basePrice,
                        product.getOldPrice() - basePrice, null, null, null, null);
            }
            return new PromotionService.PriceResult(basePrice, basePrice, 0,
                    null, null, null, null);
        });
        when(promotions.validateCoupon(any())).thenReturn(
                new PromotionService.CouponValidationResult(false, 0, "Invalid coupon", null));
        CartService cart = new CartService(products, settings, promotions);
        service = new OrderService(orders, products, cart, stock, numbers,
                new PaymentMethodCatalog(settings), new LookupRateLimiter(10, Duration.ofMinutes(15), Clock.systemUTC()),
                notifications, mongo, promotions);
        catalog.put("p1", product("p1", 500, 10));
        catalog.put("p2", product("p2", 1200, 3));
    }

    private static ApiException assertApiError(HttpStatus status, Runnable call) {
        ApiException ex = assertThrows(ApiException.class, call::run);
        assertEquals(status, ex.getStatus(), ex.getMessage());
        return ex;
    }

    @Nested
    class Checkout {
        @Test
        void codOrderIsPricedServerSideAndIgnoresClientAmounts() {
            Order order = service.create(cod(List.of(item("p1", 2), item("p2", 1))), null);

            assertEquals("QT-261123-0001", order.getOrderNumber());
            assertEquals(2200, order.getSubtotal());
            assertEquals(70, order.getDeliveryCharge(), "client sent 999; server must use settings");
            assertEquals(2270, order.getTotal(), "client coupon discount of 500 must be ignored");
            assertNull(order.getCouponDiscount());
            assertEquals("Pending", order.getStatus());
            assertEquals("Pending collection", order.getPaymentStatus());
            assertNull(order.getTrxId());
            assertEquals(2, order.getItems().size());
            assertEquals("Product p1", order.getItems().get(0).getProductName());
            assertEquals(1000, order.getItems().get(0).getLineTotal());
            assertEquals(1, order.getHistory().size());
            verify(stock).reserve(new Reservation("p1", null, 2));
            verify(stock).reserve(new Reservation("p2", null, 1));
            verify(notifications).notifyOwner(order);
        }

        @Test
        void outsideDhakaUsesOutsideDeliveryCharge() {
            CreateOrderRequest base = cod(List.of(item("p1", 1)));
            CreateOrderRequest outside = new CreateOrderRequest(base.customerName(), base.phone(), "Outside Dhaka",
                    base.address(), null, null, null, null, "COD", null, null, null, null, null, null, base.items());
            Order order = service.create(outside, null);
            assertEquals(130, order.getDeliveryCharge());
            assertEquals(630, order.getTotal());
        }

        @Test
        void normalizesPhoneWithCountryCode() {
            CreateOrderRequest base = cod(List.of(item("p1", 1)));
            CreateOrderRequest withPrefix = new CreateOrderRequest(base.customerName(), "+8801712345678", base.area(),
                    base.address(), null, null, null, null, "COD", null, null, null, null, null, null, base.items());
            assertEquals("01712345678", service.create(withPrefix, null).getPhone());
        }

        @Test
        void bkashOrderStoresUppercaseTrxIdAndAwaitsVerification() {
            Order order = service.create(bkash("9k8j7h6g5f", List.of(item("p1", 1))), null);
            assertEquals("9K8J7H6G5F", order.getTrxId());
            assertEquals("9K8J7H6G5F", order.getPaymentTrxId());
            assertEquals("01712345678", order.getSenderNumber());
            assertEquals("Verification pending", order.getPaymentStatus());
        }

        @Test
        void rejectsMobilePaymentWithoutValidTrxId() {
            assertApiError(HttpStatus.BAD_REQUEST, () -> service.create(bkash("abc", List.of(item("p1", 1))), null));
            assertApiError(HttpStatus.BAD_REQUEST, () -> service.create(bkash(null, List.of(item("p1", 1))), null));
            CreateOrderRequest badSender = request("Nagad", "ABCDEFGH12", "12345", null, List.of(item("p1", 1)));
            assertApiError(HttpStatus.BAD_REQUEST, () -> service.create(badSender, null));
            verifyNoInteractions(stock);
        }

        @Test
        void rejectsDuplicateTrxId() {
            when(orders.existsByTrxIdIgnoreCase("9K8J7H6G5F")).thenReturn(true);
            ApiException ex = assertApiError(HttpStatus.CONFLICT,
                    () -> service.create(bkash("9K8J7H6G5F", List.of(item("p1", 1))), null));
            assertEquals("TRXID_USED", ex.getDetails().get("code"));
            verifyNoInteractions(stock);
        }

        @Test
        void rejectsWalletWhenStoreHasNoReceivingNumber() {
            when(settings.findById("store")).thenReturn(Optional.of(new StoreSettings()));
            ApiException ex = assertApiError(HttpStatus.BAD_REQUEST,
                    () -> service.create(bkash("9K8J7H6G5F", List.of(item("p1", 1))), null));
            assertEquals("PAYMENT_METHOD_UNAVAILABLE", ex.getDetails().get("code"));
            // COD stays available without any settings.
            assertNotNull(service.create(cod(List.of(item("p1", 1))), null));
        }

        @Test
        void rejectsInvalidCouponCodes() {
            CreateOrderRequest base = cod(List.of(item("p1", 1)));
            CreateOrderRequest withCoupon = new CreateOrderRequest(base.customerName(), base.phone(), base.area(),
                    base.address(), null, null, null, null, "COD", null, null, "FREE100", 100, null, null, base.items());
            ApiException ex = assertApiError(HttpStatus.BAD_REQUEST, () -> service.create(withCoupon, null));
            assertEquals("COUPON_INVALID", ex.getDetails().get("code"));
        }

        @Test
        void appliesServerValidatedCouponAndRecordsRedemption() {
            Coupon coupon = new Coupon();
            coupon.setCode("SAVE50");
            when(promotions.validateCoupon(any())).thenReturn(
                    new PromotionService.CouponValidationResult(true, 50, null, coupon));
            CreateOrderRequest base = cod(List.of(item("p1", 1)));
            CreateOrderRequest withCoupon = new CreateOrderRequest(base.customerName(), base.phone(), base.area(),
                    base.address(), null, null, null, null, "COD", null, null, "SAVE50", 0,
                    null, null, base.items());

            Order order = service.create(withCoupon, null);

            assertEquals(520, order.getTotal());
            assertEquals("SAVE50", order.getCouponCode());
            assertEquals(50, order.getCouponDiscount());
            verify(promotions).recordCouponUsage("SAVE50", "01712345678",
                    "QT-261123-0001", 50);
        }

        @Test
        void rejectsWhenClientTotalDiffersFromServerTotal() {
            CreateOrderRequest stale = request("COD", null, null, 1000, List.of(item("p1", 2)));
            ApiException ex = assertApiError(HttpStatus.CONFLICT, () -> service.create(stale, null));
            assertEquals("PRICE_CHANGED", ex.getDetails().get("code"));
            assertEquals(1070, ((CartQuote) ex.getDetails().get("cart")).total());
            verifyNoInteractions(stock);
        }

        @Test
        void acceptsMatchingClientTotal() {
            CreateOrderRequest fresh = request("COD", null, null, 1070, List.of(item("p1", 2)));
            assertEquals(1070, service.create(fresh, null).getTotal());
        }

        @Test
        void recalculatesProductPromotionForCartAndStoredOrder() {
            catalog.get("p1").setOldPrice(650);

            Order order = service.create(cod(List.of(item("p1", 2))), null);

            assertEquals(1000, order.getSubtotal());
            assertEquals(300, order.getPromotionalDiscount());
            assertEquals(150, order.getItems().get(0).getDiscountAmount());
            assertEquals(650, order.getItems().get(0).getOriginalPrice());
        }

        @Test
        void rejectsCartWithInsufficientStockBeforeReserving() {
            ApiException ex = assertApiError(HttpStatus.CONFLICT,
                    () -> service.create(cod(List.of(item("p1", 1), item("p2", 4))), null));
            assertEquals("CART_INVALID", ex.getDetails().get("code"));
            assertTrue(ex.getMessage().contains("only 3 left"));
            verifyNoInteractions(stock);
        }

        @Test
        void releasesEarlierReservationsWhenALaterOneLosesTheRace() {
            when(stock.reserve(new Reservation("p2", null, 1))).thenReturn(false);
            ApiException ex = assertApiError(HttpStatus.CONFLICT,
                    () -> service.create(cod(List.of(item("p1", 2), item("p2", 1))), null));
            assertEquals("OUT_OF_STOCK", ex.getDetails().get("code"));
            verify(stock).releaseAll(List.of(new Reservation("p1", null, 2)));
            verify(orders, never()).insert(any(Order.class));
        }

        @Test
        void releasesStockWhenSavingTheOrderFails() {
            when(orders.insert(any(Order.class))).thenThrow(new IllegalStateException("db down"));
            assertThrows(IllegalStateException.class, () -> service.create(cod(List.of(item("p1", 2))), null));
            verify(stock).releaseAll(List.of(new Reservation("p1", null, 2)));
            verifyNoInteractions(notifications);
        }

        @Test
        void retriesWithNextOrderNumberOnCollision() {
            when(orders.insert(any(Order.class)))
                    .thenThrow(new DuplicateKeyException("E11000 index: orderNumber_unique dup key"))
                    .thenAnswer(inv -> inv.getArgument(0));
            Order order = service.create(cod(List.of(item("p1", 1))), null);
            assertEquals("QT-261123-0002", order.getOrderNumber());
            verify(stock, never()).releaseAll(any());
        }

        @Test
        void duplicateTrxIdDetectedByIndexReleasesStock() {
            when(orders.insert(any(Order.class)))
                    .thenThrow(new DuplicateKeyException("E11000 index: trxId_unique dup key"));
            ApiException ex = assertApiError(HttpStatus.CONFLICT,
                    () -> service.create(bkash("9K8J7H6G5F", List.of(item("p1", 1))), null));
            assertEquals("TRXID_USED", ex.getDetails().get("code"));
            verify(stock).releaseAll(List.of(new Reservation("p1", null, 1)));
        }

        @Test
        void repeatedIdempotencyKeyReturnsExistingOrderWithoutReservingAgain() {
            Order existing = order("o-1", "Pending", "COD", "Pending collection");
            when(orders.findByIdempotencyKey("key-1")).thenReturn(Optional.of(existing));
            assertSame(existing, service.create(cod(List.of(item("p1", 1))), "  key-1 "));
            verifyNoInteractions(stock);
        }

        @Test
        void storesIdempotencyKeyOnNewOrder() {
            assertEquals("key-2", service.create(cod(List.of(item("p1", 1))), "key-2").getIdempotencyKey());
        }

        @Test
        void rejectsOverlongIdempotencyKey() {
            assertApiError(HttpStatus.BAD_REQUEST,
                    () -> service.create(cod(List.of(item("p1", 1))), "x".repeat(101)));
        }

        @Test
        void notificationFailureDoesNotFailCheckout() {
            doThrow(new RuntimeException("executor rejected")).when(notifications).notifyOwner(any());
            assertNotNull(service.create(cod(List.of(item("p1", 1))), null));
        }
    }

    @Nested
    class StatusLifecycle {
        private Order stored(String status, String method, String paymentStatus) {
            Order order = order("order-1", status, method, paymentStatus);
            when(orders.findById("order-1")).thenReturn(Optional.of(order));
            return order;
        }

        @Test
        void blocksMobileMoneyConfirmationBeforePaymentVerification() {
            stored("Pending", "bKash", "Verification pending");
            assertApiError(HttpStatus.CONFLICT,
                    () -> service.updateStatus("order-1", new OrderStatusRequest("Confirmed", null, null)));
        }

        @Test
        void confirmsVerifiedMobilePayment() {
            stored("Pending", "Nagad", "Verified");
            assertEquals("Confirmed",
                    service.updateStatus("order-1", new OrderStatusRequest("Confirmed", null, null)).getStatus());
        }

        @Test
        void allowsConfirmedToShippedAndLogsHistory() {
            stored("Confirmed", "COD", "Pending collection");
            Order updated = service.updateStatus("order-1", new OrderStatusRequest("Shipped", "Courier handover", null));
            assertEquals("Shipped", updated.getStatus());
            assertEquals(1, updated.getHistory().size());
            assertEquals("Courier handover", updated.getHistory().get(0).getNote());
            assertEquals("Confirmed", updated.getHistory().get(0).getFromStatus());
        }

        @Test
        void codDeliveryMarksCashCollected() {
            stored("Shipped", "COD", "Pending collection");
            Order updated = service.updateStatus("order-1", new OrderStatusRequest("Delivered", null, null));
            assertEquals("Delivered", updated.getStatus());
            assertEquals("Collected", updated.getPaymentStatus());
        }

        @Test
        void rejectsSkippingSteps() {
            stored("Pending", "COD", "Pending collection");
            assertApiError(HttpStatus.BAD_REQUEST,
                    () -> service.updateStatus("order-1", new OrderStatusRequest("Delivered", null, null)));
        }

        @Test
        void finalStatusesCannotChange() {
            stored("Delivered", "COD", "Collected");
            assertApiError(HttpStatus.CONFLICT,
                    () -> service.updateStatus("order-1", new OrderStatusRequest("Cancelled", null, "late")));
        }

        @Test
        void rejectsCancellationWithoutReason() {
            stored("Pending", "COD", "Pending collection");
            assertApiError(HttpStatus.BAD_REQUEST,
                    () -> service.updateStatus("order-1", new OrderStatusRequest("Cancelled", null, null)));
            verifyNoInteractions(stock);
        }

        @Test
        void cancellationRestoresStockAndRecordsReason() {
            stored("Confirmed", "COD", "Pending collection");
            Order updated = service.updateStatus("order-1",
                    new OrderStatusRequest("Cancelled", null, "Customer changed mind"));
            assertEquals("Cancelled", updated.getStatus());
            assertEquals("Customer changed mind", updated.getCancellationReason());
            assertEquals("Cancelled", updated.getPaymentStatus());
            verify(stock).releaseAll(List.of(new Reservation("p1", null, 2)));
        }

        @Test
        void cancellingVerifiedWalletPaymentRequiresRefund() {
            stored("Confirmed", "bKash", "Verified");
            Order updated = service.updateStatus("order-1", new OrderStatusRequest("Cancelled", "Out of area", null));
            assertEquals("Refund pending", updated.getPaymentStatus());
            assertEquals("Out of area", updated.getCancellationReason());
        }

        @Test
        void cancellingUnverifiedWalletPaymentKeepsPaymentStatus() {
            stored("Pending", "bKash", "Failed");
            Order updated = service.updateStatus("order-1", new OrderStatusRequest("Cancelled", null, "No payment received"));
            assertEquals("Failed", updated.getPaymentStatus());
        }

        @Test
        void concurrentChangeIsRejectedAndStockNotRestoredTwice() {
            stored("Pending", "COD", "Pending collection");
            when(mongo.findAndReplace(any(Query.class), any(Order.class))).thenReturn(null);
            ApiException ex = assertApiError(HttpStatus.CONFLICT,
                    () -> service.updateStatus("order-1", new OrderStatusRequest("Cancelled", null, "dup")));
            assertEquals("CONCURRENT_UPDATE", ex.getDetails().get("code"));
            verifyNoInteractions(stock);
        }

        @Test
        void compareAndSetQueryGuardsStatusAndPaymentStatus() {
            stored("Pending", "COD", "Pending collection");
            service.updateStatus("order-1", new OrderStatusRequest("Confirmed", null, null));
            ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
            verify(mongo).findAndReplace(query.capture(), any(Order.class));
            String json = query.getValue().getQueryObject().toJson();
            assertTrue(json.contains("\"status\": \"Pending\""), json);
            assertTrue(json.contains("\"paymentStatus\": \"Pending collection\""), json);
        }

        @Test
        void unknownOrderIs404() {
            assertApiError(HttpStatus.NOT_FOUND,
                    () -> service.updateStatus("missing", new OrderStatusRequest("Confirmed", null, null)));
        }
    }

    @Nested
    class Tracking {
        @Test
        void findsOrderWhenPhoneMatchesInAnyFormat() {
            Order order = order("o-1", "Pending", "COD", "Pending collection");
            when(orders.findByOrderNumberIgnoreCase("QT-261123-0001")).thenReturn(Optional.of(order));
            assertSame(order, service.track(" QT-261123-0001 ", "+88 01712-345678", "1.1.1.1"));
        }

        @Test
        void wrongPhoneLooksLikeMissingOrder() {
            Order order = order("o-1", "Pending", "COD", "Pending collection");
            when(orders.findByOrderNumberIgnoreCase("QT-261123-0001")).thenReturn(Optional.of(order));
            ApiException wrongPhone = assertApiError(HttpStatus.NOT_FOUND,
                    () -> service.track("QT-261123-0001", "01799999999", "1.1.1.1"));
            ApiException missing = assertApiError(HttpStatus.NOT_FOUND,
                    () -> service.track("QT-000000-0000", "01712345678", "1.1.1.1"));
            assertEquals(missing.getMessage(), wrongPhone.getMessage());
        }

        @Test
        void invalidPhoneIs404NotServerError() {
            assertApiError(HttpStatus.NOT_FOUND, () -> service.track("QT-1", "abc", "1.1.1.1"));
        }

        @Test
        void rateLimitsLookupsPerClient() {
            for (int i = 0; i < 10; i++) {
                assertApiError(HttpStatus.NOT_FOUND, () -> service.track("QT-x", "01712345678", "9.9.9.9"));
            }
            assertApiError(HttpStatus.TOO_MANY_REQUESTS, () -> service.track("QT-x", "01712345678", "9.9.9.9"));
            assertApiError(HttpStatus.NOT_FOUND, () -> service.track("QT-x", "01712345678", "8.8.8.8"));
        }
    }

    @Test
    void adminListFiltersByPaymentStatusAndSearchesTrxId() {
        Order a = order("a", "Pending", "bKash", "Verification pending");
        a.setTrxId("ABC123XYZ9");
        a.setCustomerName("Rahim");
        Order b = order("b", "Pending", "COD", "Pending collection");
        b.setCustomerName("Karim");
        when(orders.findAll()).thenReturn(List.of(a, b));

        assertEquals(List.of(a), service.list(null, null, "Verification pending", null));
        assertEquals(List.of(a), service.list(null, null, null, "abc123"));
        assertEquals(List.of(b), service.list(null, "COD", null, "karim"));
    }
}
