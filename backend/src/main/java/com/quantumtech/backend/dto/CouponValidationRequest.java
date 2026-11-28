package com.quantumtech.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CouponValidationRequest(
        @NotBlank String code,
        String customerPhone,
        @Valid List<CartLine> items
) {
    public record CartLine(String productId, String categoryId, int lineTotal) {}
}
