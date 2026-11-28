package com.quantumtech.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateCustomerProfileRequest(
        @NotBlank @Pattern(regexp = "Inside Dhaka|Outside Dhaka") String deliveryArea,
        @NotBlank @Size(min = 5, max = 500) String address
) {}
