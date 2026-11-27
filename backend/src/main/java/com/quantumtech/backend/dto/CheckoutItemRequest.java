package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * One cart line sent by the storefront. Only identifiers and quantity are accepted;
 * names, prices and images are always resolved server-side.
 */
public record CheckoutItemRequest(
        @NotBlank @Size(max = 64) String productId,
        @Size(max = 64) String variantId,
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = CheckoutItemRequest.MAX_QUANTITY,
                message = "Quantity cannot exceed " + CheckoutItemRequest.MAX_QUANTITY + " per item")
        int quantity
) {
    public static final int MAX_QUANTITY = 10;

    public boolean hasVariant() {
        return variantId != null && !variantId.isBlank();
    }
}
