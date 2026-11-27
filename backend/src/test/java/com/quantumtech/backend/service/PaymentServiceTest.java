package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.PaymentMethodInfo;
import com.quantumtech.backend.dto.PaymentResubmitRequest;
import com.quantumtech.backend.dto.PaymentStatusRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.StoreSettings;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.repository.SettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static com.quantumtech.backend.service.CheckoutFixtures.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final SettingsRepository settings = mock(SettingsRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private PaymentService payments;

    @BeforeEach
    void setUp() {
        when(settings.findById("store")).thenReturn(Optional.of(settingsWithWallets()));
        when(mongo.findAndReplace(any(Query.class), any(Order.class))).thenAnswer(inv -> inv.getArgument(1));
        ProductRepository products = mock(ProductRepository.class);
        LookupRateLimiter limiter = new LookupRateLimiter(10, Duration.ofMinutes(15), Clock.systemUTC());
        OrderService orderService = new OrderService(orders, products, new CartService(products, settings),
                mock(StockService.class), mock(OrderNumberGenerator.class), new PaymentMethodCatalog(settings),
                limiter, mock(NotificationService.class), mongo);
        payments = new PaymentService(orderService, limiter);
    }

    private Order stored(String status, String method, String paymentStatus) {
        Order order = order("order-1", status, method, paymentStatus);
        order.setTrxId("OLDTRX1234");
        when(orders.findById("order-1")).thenReturn(Optional.of(order));
        when(orders.findByOrderNumberIgnoreCase("QT-261123-0001")).thenReturn(Optional.of(order));
        return order;
    }

    private static void assertApiError(HttpStatus status, Runnable call) {
        ApiException ex = assertThrows(ApiException.class, call::run);
        assertEquals(status, ex.getStatus(), ex.getMessage());
    }

    // ---------------------------------------------------------------- admin verification

    @Test
    void marksMobilePaymentVerified() {
        stored("Pending", "Nagad", "Verification pending");
        Order updated = payments.updatePaymentStatus("order-1", new PaymentStatusRequest("Verified", "Statement matched"));
        assertEquals("Verified", updated.getPaymentStatus());
        assertEquals("Payment Verified: Statement matched", updated.getHistory().get(0).getNote());
    }

    @Test
    void marksPaymentFailedAndCanReverseWhilePending() {
        stored("Pending", "bKash", "Verification pending");
        assertEquals("Failed", payments.updatePaymentStatus("order-1",
                new PaymentStatusRequest("Failed", "TrxID not found")).getPaymentStatus());
        assertEquals("Verified", payments.updatePaymentStatus("order-1",
                new PaymentStatusRequest("Verified", "Found it after all")).getPaymentStatus());
    }

    @Test
    void rejectsRepeatingSameDecision() {
        stored("Pending", "bKash", "Verified");
        assertApiError(HttpStatus.CONFLICT,
                () -> payments.updatePaymentStatus("order-1", new PaymentStatusRequest("Verified", null)));
    }

    @Test
    void verificationIsLockedOnceOrderIsConfirmed() {
        stored("Confirmed", "bKash", "Verified");
        assertApiError(HttpStatus.CONFLICT,
                () -> payments.updatePaymentStatus("order-1", new PaymentStatusRequest("Failed", null)));
    }

    @Test
    void codOrdersHaveNoManualVerification() {
        stored("Pending", "COD", "Pending collection");
        assertApiError(HttpStatus.BAD_REQUEST,
                () -> payments.updatePaymentStatus("order-1", new PaymentStatusRequest("Verified", null)));
    }

    @Test
    void refundOnlyAfterCancellationOfVerifiedPayment() {
        stored("Pending", "bKash", "Verification pending");
        assertApiError(HttpStatus.CONFLICT,
                () -> payments.updatePaymentStatus("order-1", new PaymentStatusRequest("Refunded", null)));

        stored("Cancelled", "bKash", "Refund pending");
        assertEquals("Refunded", payments.updatePaymentStatus("order-1",
                new PaymentStatusRequest("Refunded", "Sent back to 01712345678")).getPaymentStatus());
    }

    // ---------------------------------------------------------------- customer resubmission

    @Test
    void customerCanResubmitTrxIdAfterFailedVerification() {
        stored("Pending", "bKash", "Failed");
        Order updated = payments.resubmit("QT-261123-0001",
                new PaymentResubmitRequest("01712345678", "newtrx5678", "01898765432"), "1.1.1.1");
        assertEquals("NEWTRX5678", updated.getTrxId());
        assertEquals("NEWTRX5678", updated.getPaymentTrxId());
        assertEquals("01898765432", updated.getSenderNumber());
        assertEquals("Verification pending", updated.getPaymentStatus());
        assertEquals("Customer", updated.getHistory().get(0).getChangedBy());
    }

    @Test
    void resubmissionRequiresMatchingPhone() {
        stored("Pending", "bKash", "Failed");
        assertApiError(HttpStatus.NOT_FOUND, () -> payments.resubmit("QT-261123-0001",
                new PaymentResubmitRequest("01799999999", "NEWTRX5678", "01898765432"), "1.1.1.1"));
    }

    @Test
    void resubmissionBlockedOnceVerifiedOrConfirmed() {
        stored("Pending", "bKash", "Verified");
        assertApiError(HttpStatus.CONFLICT, () -> payments.resubmit("QT-261123-0001",
                new PaymentResubmitRequest("01712345678", "NEWTRX5678", "01898765432"), "1.1.1.1"));

        stored("Confirmed", "bKash", "Verified");
        assertApiError(HttpStatus.CONFLICT, () -> payments.resubmit("QT-261123-0001",
                new PaymentResubmitRequest("01712345678", "NEWTRX5678", "01898765432"), "1.1.1.1"));
    }

    @Test
    void resubmissionRejectsSameOrAlreadyUsedTrxId() {
        stored("Pending", "Nagad", "Failed");
        assertApiError(HttpStatus.CONFLICT, () -> payments.resubmit("QT-261123-0001",
                new PaymentResubmitRequest("01712345678", "oldtrx1234", "01898765432"), "1.1.1.1"));

        when(orders.existsByTrxIdIgnoreCase("USEDTRX999")).thenReturn(true);
        assertApiError(HttpStatus.CONFLICT, () -> payments.resubmit("QT-261123-0001",
                new PaymentResubmitRequest("01712345678", "USEDTRX999", "01898765432"), "1.1.1.1"));
    }

    @Test
    void codOrderCannotResubmitPayment() {
        stored("Pending", "COD", "Pending collection");
        assertApiError(HttpStatus.BAD_REQUEST, () -> payments.resubmit("QT-261123-0001",
                new PaymentResubmitRequest("01712345678", "NEWTRX5678", "01898765432"), "1.1.1.1"));
    }

    // ---------------------------------------------------------------- method catalog

    @Test
    void walletsAreOnlyAvailableWithReceivingNumbers() {
        PaymentMethodCatalog catalog = new PaymentMethodCatalog(settings);
        List<PaymentMethodInfo> configured = catalog.methods();
        assertEquals(List.of("COD", "bKash", "Nagad"), configured.stream().map(PaymentMethodInfo::code).toList());
        assertTrue(configured.stream().allMatch(PaymentMethodInfo::available));
        assertEquals(BKASH_NUMBER, configured.get(1).merchantNumber());
        assertTrue(configured.get(1).instructions().stream().anyMatch(s -> s.contains(BKASH_NUMBER)));
        assertTrue(configured.get(1).instructionsBn().stream().anyMatch(s -> s.contains(BKASH_NUMBER)));
        assertFalse(configured.get(0).requiresTrxId());

        when(settings.findById("store")).thenReturn(Optional.of(new StoreSettings()));
        assertTrue(catalog.isAvailable("COD"));
        assertFalse(catalog.isAvailable("bKash"));
        assertFalse(catalog.isAvailable("Nagad"));
        assertNull(catalog.methods().get(1).merchantNumber());
    }
}
