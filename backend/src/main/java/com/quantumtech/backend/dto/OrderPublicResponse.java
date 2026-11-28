package com.quantumtech.backend.dto;

import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.OrderItem;
import com.quantumtech.backend.model.OrderStatus;
import com.quantumtech.backend.model.OrderStatusLog;
import com.quantumtech.backend.model.PaymentMethod;
import com.quantumtech.backend.model.PaymentStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Customer-facing view of an order, returned by checkout (order confirmation) and tracking.
 * Field names match the admin {@link Order} JSON so the storefront can share one type, but
 * internal fields (idempotency key, notification status, admin notes) are left out.
 */
public record OrderPublicResponse(
        String id,
        String orderNumber,
        String customerName,
        String phone,
        String area,
        String address,
        String note,
        List<Item> items,
        int subtotal,
        Integer promotionalDiscount,
        String couponCode,
        Integer couponDiscount,
        int deliveryCharge,
        int total,
        String paymentMethod,
        String paymentStatus,
        String trxId,
        String senderNumber,
        boolean paymentActionRequired,
        String status,
        String cancellationReason,
        List<HistoryEntry> history,
        List<Step> steps,
        List<TimelineEntry> timeline,
        Instant createdAt,
        Instant updatedAt
) {
    public record Item(String id, String orderId, String productId, String variantId,
                       String productName, String variantName, String image, int unitPrice,
                       Integer originalPrice, Integer discountAmount, String appliedDiscountId,
                       int quantity, int lineTotal) {
        static Item from(OrderItem item) {
            return new Item(item.getId(), item.getOrderId(), item.getProductId(), item.getVariantId(),
                    item.getProductName(), item.getVariantName(), item.getImage(), item.getUnitPrice(),
                    item.getOriginalPrice(), item.getDiscountAmount(), item.getAppliedDiscountId(),
                    item.getQuantity(), item.getLineTotal());
        }
    }

    /** Progress bar step: Pending, Confirmed, Shipped, Delivered. */
    public record Step(String status, boolean completed, boolean current, Instant at) {}

    /** Status change visible to the customer (admin notes are intentionally omitted). */
    public record TimelineEntry(String status, Instant at) {}

    /** History shape used by the storefront; administrator notes are never exposed. */
    public record HistoryEntry(String id, String orderId, String fromStatus, String toStatus,
                               String changedBy, Instant changedAt) {
        static HistoryEntry from(OrderStatusLog log) {
            return new HistoryEntry(log.getId(), log.getOrderId(), log.getFromStatus(),
                    log.getToStatus(), log.getChangedBy(), log.getChangedAt());
        }
    }

    public static OrderPublicResponse from(Order order) {
        List<OrderStatusLog> history = Objects.requireNonNullElse(order.getHistory(), List.of());
        List<TimelineEntry> timeline = new ArrayList<>();
        for (OrderStatusLog log : history) {
            boolean placed = timeline.isEmpty() && OrderStatus.PENDING.equals(log.getToStatus());
            boolean changed = log.getToStatus() != null && !log.getToStatus().equals(log.getFromStatus());
            if (placed || changed) timeline.add(new TimelineEntry(log.getToStatus(), log.getChangedAt()));
        }
        if (timeline.isEmpty()) timeline.add(new TimelineEntry(OrderStatus.PENDING, order.getCreatedAt()));

        String status = order.getStatus();
        int reached = OrderStatus.PROGRESSION.indexOf(status);
        List<Step> steps = new ArrayList<>();
        for (int i = 0; i < OrderStatus.PROGRESSION.size(); i++) {
            String stepStatus = OrderStatus.PROGRESSION.get(i);
            Instant at = timeline.stream().filter(t -> stepStatus.equals(t.status()))
                    .map(TimelineEntry::at).reduce((a, b) -> b).orElse(null);
            boolean completed = reached >= 0 ? i <= reached : at != null;
            steps.add(new Step(stepStatus, completed, i == reached, at));
        }

        boolean actionRequired = PaymentMethod.isMobileWallet(order.getPaymentMethod())
                && OrderStatus.PENDING.equals(status)
                && PaymentStatus.FAILED.equals(order.getPaymentStatus());

        return new OrderPublicResponse(
                order.getId(), order.getOrderNumber(), order.getCustomerName(), order.getPhone(),
                order.getArea(), order.getAddress(), order.getNote(),
                Objects.requireNonNullElse(order.getItems(), List.<OrderItem>of())
                        .stream().map(Item::from).toList(),
                order.getSubtotal(), order.getPromotionalDiscount(), order.getCouponCode(),
                order.getCouponDiscount(), order.getDeliveryCharge(), order.getTotal(),
                order.getPaymentMethod(), order.getPaymentStatus(), order.getTrxId(),
                order.getSenderNumber(), actionRequired, status, order.getCancellationReason(),
                history.stream().map(HistoryEntry::from).toList(),
                steps, timeline, order.getCreatedAt(), order.getUpdatedAt());
    }
}
