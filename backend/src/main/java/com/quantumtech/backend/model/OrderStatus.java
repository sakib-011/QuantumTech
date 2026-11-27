package com.quantumtech.backend.model;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Order fulfilment lifecycle. Values are persisted as plain strings on {@link Order#getStatus()}.
 *
 * <pre>
 * Pending -> Confirmed -> Shipped -> Delivered
 *    \___________\___________\-----> Cancelled (reason required)
 * </pre>
 * Delivered and Cancelled are final.
 */
public final class OrderStatus {
    public static final String PENDING = "Pending";
    public static final String CONFIRMED = "Confirmed";
    public static final String SHIPPED = "Shipped";
    public static final String DELIVERED = "Delivered";
    public static final String CANCELLED = "Cancelled";

    /** Happy-path progression shown to customers on the tracking page. */
    public static final List<String> PROGRESSION = List.of(PENDING, CONFIRMED, SHIPPED, DELIVERED);

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED),
            CONFIRMED, Set.of(SHIPPED, CANCELLED),
            SHIPPED, Set.of(DELIVERED, CANCELLED));

    private OrderStatus() {}

    public static boolean isFinal(String status) {
        return DELIVERED.equals(status) || CANCELLED.equals(status);
    }

    public static boolean canTransition(String from, String to) {
        return TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }
}
