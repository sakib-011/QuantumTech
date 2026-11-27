package com.quantumtech.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Guest checkout request.
 *
 * <p>{@code subtotal}, {@code deliveryCharge} and {@code total} are optional echoes of what the
 * customer saw. They are never trusted: the server recalculates every amount. When {@code total}
 * is sent and differs from the server total, checkout is rejected with {@code PRICE_CHANGED}
 * so the customer can review the new amount. {@code couponDiscount} is ignored.
 */
public record CreateOrderRequest(
        @NotBlank @Size(min = 2, max = 80) String customerName,
        @NotBlank
        @Pattern(regexp = Phone.PATTERN, message = Phone.MESSAGE)
        String phone,
        @NotBlank
        @Pattern(regexp = "Inside Dhaka|Outside Dhaka", message = "Area must be Inside Dhaka or Outside Dhaka")
        String area,
        @NotBlank @Size(min = 5, max = 300) String address,
        @Size(max = 500) String note,
        Integer subtotal,
        Integer deliveryCharge,
        Integer total,
        @NotBlank
        @Pattern(regexp = "COD|bKash|Nagad", message = "Payment method must be COD, bKash or Nagad")
        String paymentMethod,
        @Size(max = 20) String trxId,
        @Size(max = 20) String senderNumber,
        @Size(max = 40) String couponCode,
        Integer couponDiscount,
        @Size(max = 50) String source,
        @Pattern(regexp = "en|bn", message = "Language must be en or bn") String language,
        @NotEmpty @Size(max = 50, message = "A cart can contain at most 50 lines")
        List<@Valid CheckoutItemRequest> items
) {}
