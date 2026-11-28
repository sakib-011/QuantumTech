package com.quantumtech.backend.dto;

import com.quantumtech.backend.model.CustomerUser;

public record CustomerAuthResponse(
        String token,
        String id,
        String email,
        String name,
        String phone,
        String deliveryArea,
        String address,
        String role
) {
    public static CustomerAuthResponse from(String token, CustomerUser customer) {
        return new CustomerAuthResponse(token, customer.getId(), customer.getEmail(),
                customer.getName(), customer.getPhone(), customer.getDeliveryArea(),
                customer.getAddress(), "Customer");
    }
}
