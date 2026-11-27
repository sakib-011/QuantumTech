package com.quantumtech.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrderStatusRequest(
        @NotBlank
        @Pattern(regexp = "Pending|Confirmed|Shipped|Delivered|Cancelled") String status,
        @Size(max = 500) String note,
        @Size(max = 500) String reason
) {}
