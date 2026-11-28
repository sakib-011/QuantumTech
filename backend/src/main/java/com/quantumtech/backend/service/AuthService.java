package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.LoginRequest;
import com.quantumtech.backend.dto.LoginResponse;
import com.quantumtech.backend.dto.UpdateAdminProfileRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.AdminUser;
import com.quantumtech.backend.repository.AdminUserRepository;
import com.quantumtech.backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class AuthService {
    private final AdminUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;

    public AuthService(AdminUserRepository users, PasswordEncoder passwordEncoder,
                       JwtService jwtService, MailService mailService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }

    public LoginResponse login(LoginRequest request) {
        AdminUser user = users.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.LOCKED, "Account locked for 15 minutes");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);
            if (attempts >= 5) {
                user.setLockedUntil(Instant.now().plusSeconds(15 * 60));
            }
            users.save(user);
            throw new ApiException(HttpStatus.UNAUTHORIZED,
                    attempts >= 5 ? "Account locked for 15 minutes" :
                            "Invalid credentials. " + (5 - attempts) + " attempt(s) remaining");
        }

        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        users.save(user);
        return LoginResponse.of(jwtService.generateToken(user.getEmail(), "ADMIN"), user);
    }

    public LoginResponse updateProfile(String currentEmail, UpdateAdminProfileRequest request) {
        AdminUser user = users.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Administrator not found"));
        String updatedEmail = request.email().trim().toLowerCase();
        users.findByEmailIgnoreCase(updatedEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new ApiException(HttpStatus.CONFLICT, "That administrator email is already in use");
                });
        user.setName(request.name().trim());
        user.setEmail(updatedEmail);
        AdminUser saved = users.save(user);
        return LoginResponse.of(jwtService.generateToken(saved.getEmail(), "ADMIN"), saved);
    }

    public void forgotPassword(String email) {
        users.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            String token = HexFormat.of().formatHex(bytes);
            user.setResetTokenHash(hash(token));
            user.setResetTokenExpiresAt(Instant.now().plusSeconds(30 * 60));
            users.save(user);
            mailService.sendResetLink(user.getEmail(), token);
        });
    }

    public void resetPassword(String token, String newPassword) {
        String hash = hash(token);
        AdminUser user = users.findAll().stream()
                .filter(candidate -> hash.equals(candidate.getResetTokenHash()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Reset link is invalid"));

        if (user.getResetTokenExpiresAt() == null ||
                user.getResetTokenExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reset link has expired");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetTokenHash(null);
        user.setResetTokenExpiresAt(null);
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        users.save(user);
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
