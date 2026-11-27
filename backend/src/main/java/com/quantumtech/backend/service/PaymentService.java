package com.quantumtech.backend.service;

import com.quantumtech.backend.config.OrderIndexInitializer;
import com.quantumtech.backend.dto.PaymentResubmitRequest;
import com.quantumtech.backend.dto.PaymentStatusRequest;
import com.quantumtech.backend.dto.Phone;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.OrderStatus;
import com.quantumtech.backend.model.PaymentMethod;
import com.quantumtech.backend.model.PaymentStatus;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Manual bKash/Nagad payment workflow.
 *
 * <ol>
 *   <li>Customer sends money to the store number and submits TrxID + sender number at checkout
 *       (payment status {@code Verification pending}).</li>
 *   <li>Admin checks the wallet statement and marks the payment {@code Verified} or {@code Failed}
 *       while the order is still Pending. Only a Verified order can be Confirmed.</li>
 *   <li>After a {@code Failed} decision (or a typo) the customer can resubmit corrected details.</li>
 *   <li>If a Verified order is cancelled it becomes {@code Refund pending}; the admin marks it
 *       {@code Refunded} once the money is returned.</li>
 * </ol>
 */
@Service
public class PaymentService {
    private static final Set<String> DECIDABLE = Set.of(
            PaymentStatus.VERIFICATION_PENDING, PaymentStatus.VERIFIED, PaymentStatus.FAILED);
    private static final Set<String> RESUBMITTABLE = Set.of(
            PaymentStatus.VERIFICATION_PENDING, PaymentStatus.FAILED);

    private final OrderService orders;
    private final LookupRateLimiter lookupLimiter;

    public PaymentService(OrderService orders, LookupRateLimiter lookupLimiter) {
        this.orders = orders;
        this.lookupLimiter = lookupLimiter;
    }

    /** Admin decision: Verified, Failed (before confirmation) or Refunded (after a refund). */
    public Order updatePaymentStatus(String orderId, PaymentStatusRequest request) {
        Order order = orders.getById(orderId);
        if (!PaymentMethod.isMobileWallet(order.getPaymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment verification is only for bKash or Nagad");
        }
        String current = order.getPaymentStatus();
        String target = request.status();

        if (PaymentStatus.REFUNDED.equals(target)) {
            if (!PaymentStatus.REFUND_PENDING.equals(current)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Only cancelled orders awaiting a refund can be marked Refunded");
            }
        } else if (PaymentStatus.VERIFIED.equals(target) || PaymentStatus.FAILED.equals(target)) {
            if (!OrderStatus.PENDING.equals(order.getStatus())) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Payment can only be verified or rejected while the order is Pending");
            }
            if (target.equals(current)) {
                throw new ApiException(HttpStatus.CONFLICT, "Payment is already " + target);
            }
            if (current != null && !DECIDABLE.contains(current)) {
                throw new ApiException(HttpStatus.CONFLICT, "Payment status " + current + " cannot be changed");
            }
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status must be Verified, Failed or Refunded");
        }

        order.setPaymentStatus(target);
        order.setUpdatedAt(Instant.now());
        String note = request.note() == null || request.note().isBlank()
                ? "Payment status updated to " + target
                : "Payment " + target + ": " + request.note().trim();
        OrderService.addHistory(order, order.getStatus(), order.getStatus(), "Admin", note, null);
        return orders.saveIfUnchanged(order, order.getStatus(), current);
    }

    /** Customer corrects TrxID/sender number for a Pending bKash/Nagad order. */
    public Order resubmit(String orderNumber, PaymentResubmitRequest request, String clientKey) {
        lookupLimiter.check(clientKey);
        Order order = orders.findForCustomer(orderNumber, request.phone());
        if (!PaymentMethod.isMobileWallet(order.getPaymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This order is Cash on Delivery; no payment details are needed");
        }
        if (!OrderStatus.PENDING.equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Payment details can only be changed while the order is Pending");
        }
        String current = order.getPaymentStatus();
        if (current != null && !RESUBMITTABLE.contains(current)) {
            throw new ApiException(HttpStatus.CONFLICT, "Payment has already been " + current.toLowerCase(Locale.ROOT));
        }

        String trxId = request.trxId().trim().toUpperCase(Locale.ROOT);
        String sender = Phone.normalize(request.senderNumber());
        if (!Phone.isValid(sender)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sender number must be a valid 11-digit mobile number");
        }
        if (trxId.equalsIgnoreCase(order.getTrxId())) {
            throw new ApiException(HttpStatus.CONFLICT, "This TrxID is already on your order. Please enter the new TrxID.",
                    Map.of("code", "TRXID_UNCHANGED"));
        }
        orders.ensureTrxIdUnused(trxId);

        order.setTrxId(trxId);
        order.setPaymentTrxId(trxId);
        order.setSenderNumber(sender);
        order.setPaymentSender(sender);
        order.setPaymentStatus(PaymentStatus.VERIFICATION_PENDING);
        order.setUpdatedAt(Instant.now());
        OrderService.addHistory(order, order.getStatus(), order.getStatus(), "Customer",
                "Customer resubmitted " + order.getPaymentMethod() + " payment details (TrxID " + trxId + ")", null);
        try {
            return orders.saveIfUnchanged(order, OrderStatus.PENDING, current);
        } catch (DuplicateKeyException ex) {
            if (String.valueOf(ex.getMessage()).contains(OrderIndexInitializer.TRX_ID_INDEX)) {
                throw OrderService.trxIdUsed();
            }
            throw ex;
        }
    }
}
