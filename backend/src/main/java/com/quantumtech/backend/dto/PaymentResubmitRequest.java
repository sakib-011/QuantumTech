package com.quantumtech.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Customer correction of bKash/Nagad payment details after a typo or a Failed verification.
 * {@code phone} must match the order's phone number.
 */
public record PaymentResubmitRequest(
        @NotBlank @Pattern(regexp = Phone.PATTERN, message = Phone.MESSAGE) String phone,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9]{8,12}", message = "TrxID must be 8-12 letters or digits")
        String trxId,
        @NotBlank @Pattern(regexp = Phone.PATTERN, message = "Sender number must be a valid 11-digit mobile number")
        String senderNumber
) {}
