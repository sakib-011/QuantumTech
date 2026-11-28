package com.quantumtech.backend.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.OrderItem;
import com.quantumtech.backend.model.OrderStatusLog;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrderPublicResponseTest {
    private static OrderStatusLog log(String from, String to, String note, Instant at) {
        OrderStatusLog l = new OrderStatusLog();
        l.setFromStatus(from);
        l.setToStatus(to);
        l.setNote(note);
        l.setChangedBy("Admin");
        l.setChangedAt(at);
        return l;
    }

    private static Order order(String status, String method, String paymentStatus) {
        Instant t0 = Instant.parse("2026-11-23T10:00:00Z");
        Order o = new Order();
        o.setId("id-1");
        o.setOrderNumber("QT-261123-0001");
        o.setStatus(status);
        o.setPaymentMethod(method);
        o.setPaymentStatus(paymentStatus);
        o.setIdempotencyKey("secret-key");
        o.setNotificationStatus("Failed");
        o.setCreatedAt(t0);
        OrderItem item = new OrderItem();
        item.setProductName("Charger");
        item.setQuantity(1);
        item.setUnitPrice(500);
        item.setLineTotal(500);
        o.setItems(List.of(item));
        o.setHistory(new ArrayList<>(List.of(
                log("Pending", "Pending", "Order placed", t0),
                log("Pending", "Pending", "Payment Verified: internal statement ref 123", t0.plusSeconds(60)),
                log("Pending", "Confirmed", "Called customer, rude", t0.plusSeconds(120)),
                log("Confirmed", "Shipped", "Pathao #555", t0.plusSeconds(180)))));
        return o;
    }

    @Test
    void exposesProgressWithoutInternalFields() throws Exception {
        OrderPublicResponse response = OrderPublicResponse.from(order("Shipped", "bKash", "Verified"));

        assertEquals(List.of("Pending", "Confirmed", "Shipped"),
                response.timeline().stream().map(OrderPublicResponse.TimelineEntry::status).toList());
        assertEquals(List.of(true, true, true, false),
                response.steps().stream().map(OrderPublicResponse.Step::completed).toList());
        assertTrue(response.steps().get(2).current());
        assertNotNull(response.steps().get(1).at());
        assertNull(response.steps().get(3).at());
        assertFalse(response.paymentActionRequired());

        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        String json = mapper.writeValueAsString(response);
        assertFalse(json.contains("secret-key"), json);
        assertFalse(json.contains("idempotencyKey"), json);
        assertFalse(json.contains("notificationStatus"), json);
        assertFalse(json.contains("rude"), "admin notes must not reach customers");
        assertFalse(json.contains("statement ref"), "admin notes must not reach customers");
        assertTrue(json.contains("\"orderNumber\":\"QT-261123-0001\""));
        assertEquals(List.of("Pending", "Pending", "Confirmed", "Shipped"),
                response.history().stream().map(OrderPublicResponse.HistoryEntry::toStatus).toList());
        assertFalse(mapper.readTree(json).path("history").get(1).has("note"),
                "admin notes must not reach customers");
    }

    @Test
    void cancelledOrderShowsOnlyReachedSteps() {
        Order o = order("Cancelled", "COD", "Cancelled");
        o.getHistory().add(log("Shipped", "Cancelled", "x", Instant.parse("2026-11-23T11:00:00Z")));
        o.setCancellationReason("Customer unreachable");
        OrderPublicResponse response = OrderPublicResponse.from(o);
        assertEquals(List.of(true, true, true, false),
                response.steps().stream().map(OrderPublicResponse.Step::completed).toList());
        assertTrue(response.steps().stream().noneMatch(OrderPublicResponse.Step::current));
        assertEquals("Cancelled", response.timeline().get(response.timeline().size() - 1).status());
        assertEquals("Customer unreachable", response.cancellationReason());
    }

    @Test
    void failedWalletPaymentAsksCustomerForAction() {
        Order o = order("Pending", "Nagad", "Failed");
        o.setHistory(null);
        OrderPublicResponse response = OrderPublicResponse.from(o);
        assertTrue(response.paymentActionRequired());
        assertEquals(1, response.timeline().size(), "falls back to creation time");
        assertTrue(response.steps().get(0).current());
    }
}
