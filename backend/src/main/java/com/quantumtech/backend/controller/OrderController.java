package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.CreateOrderRequest;
import com.quantumtech.backend.dto.OrderPublicResponse;
import com.quantumtech.backend.dto.OrderStatusRequest;
import com.quantumtech.backend.dto.PaymentStatusRequest;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.service.OrderService;
import com.quantumtech.backend.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class OrderController {
    private final OrderService orders;
    private final PaymentService payments;

    public OrderController(OrderService orders, PaymentService payments) {
        this.orders = orders;
        this.payments = payments;
    }

    /** Guest checkout. Returns the order confirmation (201). Repeating the same idempotency key returns the same order. */
    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderPublicResponse create(@Valid @RequestBody CreateOrderRequest request,
                                      @RequestHeader(value = "X-Idempotency-Key", required = false) String key) {
        return OrderPublicResponse.from(orders.create(request, key));
    }

    /** Public tracking by order number + checkout phone. Rate limited per client IP. */
    @GetMapping("/orders/track")
    public OrderPublicResponse track(@RequestParam String orderNumber,
                                     @RequestParam String phone,
                                     HttpServletRequest request) {
        return OrderPublicResponse.from(orders.track(orderNumber, phone, request.getRemoteAddr()));
    }

    @GetMapping("/admin/orders")
    public List<Order> list(@RequestParam(required = false) String status,
                            @RequestParam(required = false) String paymentMethod,
                            @RequestParam(required = false) String paymentStatus,
                            @RequestParam(required = false) String search) {
        return orders.list(status, paymentMethod, paymentStatus, search);
    }

    @GetMapping("/admin/orders/{id}")
    public Order get(@PathVariable String id) {
        return orders.getById(id);
    }

    @PatchMapping("/admin/orders/{id}/status")
    public Order updateStatus(@PathVariable String id,
                              @Valid @RequestBody OrderStatusRequest request) {
        return orders.updateStatus(id, request);
    }

    @PatchMapping("/admin/orders/{id}/payment")
    public Order verifyPayment(@PathVariable String id,
                               @Valid @RequestBody PaymentStatusRequest request) {
        return payments.updatePaymentStatus(id, request);
    }

    @GetMapping("/admin/dashboard")
    public Map<String, Object> dashboard() {
        return orders.dashboard();
    }
}
