package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateCustomerDetailsRequest(
        @NotBlank @Size(min = 2, max = 80) String name,
        @NotBlank @Email @Pattern(regexp = EmailAddress.PATTERN, message = EmailAddress.MESSAGE)
        @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = Phone.PATTERN, message = Phone.MESSAGE) String phone
) {}
