package com.quantumtech.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * One server-priced cart line.
 *
 * @param status            OK, INSUFFICIENT_STOCK, OUT_OF_STOCK, UNAVAILABLE or VARIANT_REQUIRED
 * @param quantity          quantity the customer asked for (duplicate lines are merged)
 * @param availableStock    units currently in stock for this product/variant (0 when unavailable)
 * @param originalPrice     previous price to show struck-through, or null
 * @param message           human-readable explanation when {@code status} is not OK
 */
public record CartLine(
        String productId,
        String variantId,
        String productName,
        String productNameBn,
        String slug,
        String variantName,
        String image,
        int unitPrice,
        Integer originalPrice,
        int quantity,
        int availableStock,
        int lineTotal,
        String status,
        String message
) {
    public static final String OK = "OK";
    public static final String INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK";
    public static final String OUT_OF_STOCK = "OUT_OF_STOCK";
    public static final String UNAVAILABLE = "UNAVAILABLE";
    public static final String VARIANT_REQUIRED = "VARIANT_REQUIRED";

    @JsonIgnore
    public boolean isOk() {
        return OK.equals(status);
    }
}
