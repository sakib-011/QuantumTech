package com.quantumtech.backend.dto;

import java.util.List;

/**
 * Checkout payment option shown to customers.
 *
 * @param available      false when the store has not configured a receiving number yet
 * @param requiresTrxId  true for bKash/Nagad: checkout must include trxId and senderNumber
 * @param merchantNumber number the customer sends money to (null for COD)
 */
public record PaymentMethodInfo(
        String code,
        String name,
        String nameBn,
        boolean available,
        boolean requiresTrxId,
        String merchantNumber,
        List<String> instructions,
        List<String> instructionsBn
) {}
