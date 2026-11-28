package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank @Email @Pattern(regexp = EmailAddress.PATTERN, message = EmailAddress.MESSAGE)
        @Size(max = 254) String email
) {}
