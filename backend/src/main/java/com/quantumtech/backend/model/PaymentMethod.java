package com.quantumtech.backend.model;

import java.util.List;

/** Supported checkout payment methods. Values are persisted as plain strings. */
public final class PaymentMethod {
    public static final String COD = "COD";
    public static final String BKASH = "bKash";
    public static final String NAGAD = "Nagad";

    public static final List<String> ALL = List.of(COD, BKASH, NAGAD);

    private PaymentMethod() {}

    public static boolean isValid(String method) {
        return ALL.contains(method);
    }

    /** bKash and Nagad are paid up-front by Send Money and verified manually by the admin. */
    public static boolean isMobileWallet(String method) {
        return BKASH.equals(method) || NAGAD.equals(method);
    }
}
