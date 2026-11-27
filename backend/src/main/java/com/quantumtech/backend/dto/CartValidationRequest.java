package com.quantumtech.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Asks the server to price a browser-side cart. {@code area} is optional; without it the
 * delivery charge is not added (useful for the cart drawer before the address is known).
 */
public record CartValidationRequest(
        @Pattern(regexp = "Inside Dhaka|Outside Dhaka", message = "Area must be Inside Dhaka or Outside Dhaka")
        String area,
        @NotEmpty @Size(max = 50, message = "A cart can contain at most 50 lines")
        List<@Valid CheckoutItemRequest> items
) {}
