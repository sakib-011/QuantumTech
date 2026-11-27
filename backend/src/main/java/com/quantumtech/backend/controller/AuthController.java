package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.ForgotPasswordRequest;
import com.quantumtech.backend.dto.LoginRequest;
import com.quantumtech.backend.dto.LoginResponse;
import com.quantumtech.backend.dto.ResetPasswordRequest;
import com.quantumtech.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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
