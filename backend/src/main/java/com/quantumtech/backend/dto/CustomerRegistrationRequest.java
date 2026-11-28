package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CustomerRegistrationRequest(
        @NotBlank @Size(min = 2, max = 80) String name,
        @NotBlank @Email @Pattern(regexp = EmailAddress.PATTERN, message = EmailAddress.MESSAGE)
        @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = Phone.PATTERN, message = Phone.MESSAGE) String phone,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Pattern(regexp = "Inside Dhaka|Outside Dhaka") String deliveryArea,
        @NotBlank @Size(min = 5, max = 500) String address
) {}
