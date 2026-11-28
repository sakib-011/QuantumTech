package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Pattern;

public record PaymentStatusRequest(
        @Pattern(regexp = "Verified|Failed|Refunded") String status,
        String note
) {}
