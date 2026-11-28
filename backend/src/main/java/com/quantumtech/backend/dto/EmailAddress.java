package com.quantumtech.backend.dto;

/** Practical email syntax shared by customer-facing request DTOs. */
public final class EmailAddress {
    public static final String PATTERN =
            "^(?!\\.)(?!.*\\.\\.)[A-Za-z0-9.!$%&'*+/=?^_`{|}~-]{1,64}(?<!\\.)@"
                    + "(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$";
    public static final String MESSAGE = "Enter a valid email address.";

    private EmailAddress() {}
}
