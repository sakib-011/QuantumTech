package com.quantumtech.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Admin payment decision for a bKash/Nagad order. {@code Refunded} closes a refund. */
public record PaymentStatusRequest(
        @NotBlank
        @Pattern(regexp = "Verified|Failed|Refunded", message = "Status must be Verified, Failed or Refunded")
        String status,
        @Size(max = 500) String note
) {}
