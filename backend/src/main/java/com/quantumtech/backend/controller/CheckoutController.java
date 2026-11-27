package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.CartQuote;
import com.quantumtech.backend.dto.CartValidationRequest;
import com.quantumtech.backend.dto.OrderPublicResponse;
import com.quantumtech.backend.dto.PaymentMethodInfo;
import com.quantumtech.backend.dto.PaymentResubmitRequest;
import com.quantumtech.backend.service.CartService;
import com.quantumtech.backend.service.PaymentMethodCatalog;
import com.quantumtech.backend.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Public cart and payment endpoints used by the storefront checkout flow. */
@RestController
@RequestMapping("/api")
public class CheckoutController {
    private final CartService cart;
    private final PaymentMethodCatalog paymentMethods;
    private final PaymentService payments;

    public CheckoutController(CartService cart, PaymentMethodCatalog paymentMethods, PaymentService payments) {
        this.cart = cart;
        this.paymentMethods = paymentMethods;
        this.payments = payments;
    }

    /** Re-prices a browser cart: current prices, stock problems, delivery charge and total. */
    @PostMapping("/cart/validate")
    public CartQuote validateCart(@Valid @RequestBody CartValidationRequest request) {
        return cart.quote(request.items(), request.area());
    }

    /** COD/bKash/Nagad options with availability, receiving numbers and EN/BN instructions. */
    @GetMapping("/payments/methods")
    public List<PaymentMethodInfo> paymentMethods() {
        return paymentMethods.methods();
    }

    /** Customer resubmits bKash/Nagad TrxID for a Pending order (e.g. after a Failed check). */
    @PostMapping("/orders/{orderNumber}/payment")
    public OrderPublicResponse resubmitPayment(@PathVariable String orderNumber,
                                               @Valid @RequestBody PaymentResubmitRequest request,
                                               HttpServletRequest http) {
        return OrderPublicResponse.from(payments.resubmit(orderNumber, request, http.getRemoteAddr()));
    }
}
