package com.quantumtech.backend.dto;

import com.quantumtech.backend.model.CustomerUser;

import java.time.Instant;

public record CustomerProfileResponse(
        String id,
        String email,
        String name,
        String phone,
        String deliveryArea,
        String address,
        Instant createdAt
) {
    public static CustomerProfileResponse from(CustomerUser customer) {
        return new CustomerProfileResponse(customer.getId(), customer.getEmail(),
                customer.getName(), customer.getPhone(), customer.getDeliveryArea(),
                customer.getAddress(), customer.getCreatedAt());
    }
}
