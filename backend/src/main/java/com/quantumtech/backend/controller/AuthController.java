package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.ForgotPasswordRequest;
import com.quantumtech.backend.dto.CustomerAuthResponse;
import com.quantumtech.backend.dto.CustomerLoginRequest;
import com.quantumtech.backend.dto.CustomerRegistrationRequest;
import com.quantumtech.backend.dto.CustomerResetOtpResponse;
import com.quantumtech.backend.dto.LoginRequest;
import com.quantumtech.backend.dto.LoginResponse;
import com.quantumtech.backend.dto.ResetPasswordRequest;
import com.quantumtech.backend.dto.VerifyCustomerResetOtpRequest;
import com.quantumtech.backend.service.CustomerAccountService;
import com.quantumtech.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final CustomerAccountService customerAccounts;

    public AuthController(AuthService authService, CustomerAccountService customerAccounts) {
        this.authService = authService;
        this.customerAccounts = customerAccounts;
    }

    @PostMapping("/customer/register")
    public CustomerAuthResponse registerCustomer(@Valid @RequestBody CustomerRegistrationRequest request) {
        return customerAccounts.register(request);
    }

    @PostMapping("/customer/login")
    public CustomerAuthResponse loginCustomer(@Valid @RequestBody CustomerLoginRequest request) {
        return customerAccounts.login(request);
    }

    @PostMapping("/customer/forgot-password")
    public ResponseEntity<Map<String, String>> forgotCustomerPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        customerAccounts.forgotPassword(request.email());
            return ResponseEntity.ok(Map.of(
                    "message", "If the account exists and is eligible, a reset code will be sent."));
    }

    @PostMapping("/customer/verify-reset-otp")
    public CustomerResetOtpResponse verifyCustomerResetOtp(
            @Valid @RequestBody VerifyCustomerResetOtpRequest request) {
        return new CustomerResetOtpResponse(
                customerAccounts.verifyPasswordResetOtp(request.email(), request.otp()));
    }

    @PostMapping("/customer/reset-password")
    public ResponseEntity<Map<String, String>> resetCustomerPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        customerAccounts.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgot(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.ok(Map.of("message", "If the account exists, a reset link will be sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> reset(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
    }
}
