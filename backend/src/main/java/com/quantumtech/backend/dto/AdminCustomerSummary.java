package com.quantumtech.backend.dto;

import com.quantumtech.backend.model.CustomerUser;

import java.time.Instant;

public record AdminCustomerSummary(
        String id,
        String name,
        String email,
        String phone,
        String deliveryArea,
        String address,
        boolean blocked,
        Instant createdAt,
        long orderCount,
        long deliveredOrderCount,
        long deliveredRevenue,
        Instant lastOrderAt
) {
    public static AdminCustomerSummary from(CustomerUser customer, long orderCount,
                                             long deliveredOrderCount, long deliveredRevenue,
                                             Instant lastOrderAt) {
        return new AdminCustomerSummary(customer.getId(), customer.getName(), customer.getEmail(),
                customer.getPhone(), customer.getDeliveryArea(), customer.getAddress(), customer.isBlocked(),
                customer.getCreatedAt(), orderCount, deliveredOrderCount, deliveredRevenue, lastOrderAt);
    }
}
