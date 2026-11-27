package com.quantumtech.backend.model;

/**
 * Payment lifecycle, persisted as plain strings on {@link Order#getPaymentStatus()}.
 *
 * <pre>
 * COD:          Pending collection -> Collected            (order Delivered)
 *               Pending collection -> Cancelled            (order Cancelled)
 *
 * bKash/Nagad:  Verification pending -> Verified | Failed  (admin, while order is Pending)
 *               Failed -> Verification pending             (customer resubmits TrxID)
 *               Verified -> Refund pending -> Refunded      (order Cancelled after payment)
 * </pre>
 */
public final class PaymentStatus {
    public static final String PENDING_COLLECTION = "Pending collection";
    public static final String COLLECTED = "Collected";
    public static final String VERIFICATION_PENDING = "Verification pending";
    public static final String VERIFIED = "Verified";
    public static final String FAILED = "Failed";
    public static final String REFUND_PENDING = "Refund pending";
    public static final String REFUNDED = "Refunded";
    public static final String CANCELLED = "Cancelled";

    private PaymentStatus() {}
}
