package com.quantumtech.backend.dto;

/** Bangladeshi mobile number rules shared by checkout, tracking and payment requests. */
public final class Phone {
    /** 01[3-9]XXXXXXXX, optionally prefixed with 88 or +88. */
    public static final String PATTERN = "(\\+?88)?01[3-9][0-9]{8}";
    public static final String MESSAGE = "Phone must be a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX)";

    private Phone() {}

    /** Strips spaces, dashes and the 88/+88 country prefix, returning 01XXXXXXXXX. */
    public static String normalize(String raw) {
        if (raw == null) return null;
        String clean = raw.replaceAll("[\\s-]", "");
        if (clean.startsWith("+88")) clean = clean.substring(3);
        else if (clean.startsWith("88") && clean.length() == 13) clean = clean.substring(2);
        return clean;
    }

    public static boolean isValid(String raw) {
        String clean = normalize(raw);
        return clean != null && clean.matches("01[3-9][0-9]{8}");
    }
}
