package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Pattern;

public record OrderStatusRequest(
        @Pattern(regexp = "Pending|Confirmed|Shipped|Delivered|Cancelled") String status,
        String note,
        String reason
) {}
