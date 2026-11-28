package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CustomerAuthResponse;
import com.quantumtech.backend.dto.CustomerLoginRequest;
import com.quantumtech.backend.dto.CustomerProfileResponse;
import com.quantumtech.backend.dto.CustomerProfileUpdateResponse;
import com.quantumtech.backend.dto.CustomerRegistrationRequest;
import com.quantumtech.backend.dto.OrderPublicResponse;
import com.quantumtech.backend.dto.Phone;
import com.quantumtech.backend.dto.UpdateCustomerDetailsRequest;
import com.quantumtech.backend.dto.UpdateCustomerProfileRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.CustomerUser;
import com.quantumtech.backend.repository.CustomerUserRepository;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.security.JwtService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
public class CustomerAccountService {
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_SECONDS = 15 * 60;
    private static final int MAX_RESET_OTP_ATTEMPTS = 5;
    private static final int MAX_RESET_OTP_SENDS = 3;
    private static final long RESET_OTP_WINDOW_SECONDS = 15 * 60;
    private static final long RESET_OTP_EXPIRY_SECONDS = 10 * 60;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final CustomerUserRepository customers;
    private final OrderRepository orders;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;

    public CustomerAccountService(CustomerUserRepository customers, OrderRepository orders,
                                  PasswordEncoder passwordEncoder, JwtService jwtService,
                                  MailService mailService) {
        this.customers = customers;
        this.orders = orders;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }

    public CustomerAuthResponse register(CustomerRegistrationRequest request) {
        String email = normalizeEmail(request.email());
        if (customers.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be no more than 72 bytes");
        }

        Instant now = Instant.now();
        CustomerUser customer = new CustomerUser();
        customer.setId(java.util.UUID.randomUUID().toString());
        customer.setName(request.name().trim());
        customer.setEmail(email);
        customer.setPhone(Phone.normalize(request.phone()));
        customer.setDeliveryArea(request.deliveryArea());
        customer.setAddress(request.address().trim());
        customer.setPasswordHash(passwordEncoder.encode(request.password()));
        customer.setCreatedAt(now);
        customer.setUpdatedAt(now);
        try {
            return authResponse(customers.save(customer));
        } catch (DuplicateKeyException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
    }

    public CustomerAuthResponse login(CustomerLoginRequest request) {
        CustomerUser customer = customers.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (customer.isBlocked()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This customer account has been blocked");
        }
        Instant now = Instant.now();
        if (customer.getLockedUntil() != null && customer.getLockedUntil().isAfter(now)) {
            throw new ApiException(HttpStatus.LOCKED, "Account locked for 15 minutes");
        }
        if (!passwordEncoder.matches(request.password(), customer.getPasswordHash())) {
            int attempts = customer.getFailedLoginAttempts() + 1;
            customer.setFailedLoginAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                customer.setLockedUntil(now.plusSeconds(LOCK_DURATION_SECONDS));
            }
            customer.setUpdatedAt(now);
            customers.save(customer);
            throw new ApiException(HttpStatus.UNAUTHORIZED,
                    attempts >= MAX_FAILED_ATTEMPTS ? "Account locked for 15 minutes" : "Invalid email or password");
        }

        customer.setFailedLoginAttempts(0);
        customer.setLockedUntil(null);
        customer.setUpdatedAt(now);
        return authResponse(customers.save(customer));
    }

    public CustomerProfileResponse profile(String email) {
        return CustomerProfileResponse.from(findCustomer(email));
    }

    public CustomerProfileResponse updateProfile(String email, UpdateCustomerProfileRequest request) {
        CustomerUser customer = findCustomer(email);
        customer.setDeliveryArea(request.deliveryArea());
        customer.setAddress(request.address().trim());
        customer.setUpdatedAt(Instant.now());
        return CustomerProfileResponse.from(customers.save(customer));
    }

    public CustomerProfileUpdateResponse updatePersonalDetails(
            String email, UpdateCustomerDetailsRequest request) {
        CustomerUser customer = findCustomer(email);
        String updatedEmail = normalizeEmail(request.email());
        if (!customer.getEmail().equalsIgnoreCase(updatedEmail)
                && customers.existsByEmailIgnoreCase(updatedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        customer.setName(request.name().trim());
        customer.setEmail(updatedEmail);
        customer.setPhone(Phone.normalize(request.phone()));
        customer.setUpdatedAt(Instant.now());
        String token = jwtService.generateToken(updatedEmail, "CUSTOMER");
        try {
            CustomerUser updated = customers.save(customer);
            return new CustomerProfileUpdateResponse(token, CustomerProfileResponse.from(updated));
        } catch (DuplicateKeyException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
    }

    public void forgotPassword(String email) {
        customers.findByEmailIgnoreCase(normalizeEmail(email)).ifPresent(customer -> {
            if (customer.isBlocked()) return;
            Instant now = Instant.now();
            Instant windowStartedAt = customer.getResetOtpWindowStartedAt();
            int sendCount = customer.getResetOtpSendCount();
            if (windowStartedAt == null
                    || windowStartedAt.plusSeconds(RESET_OTP_WINDOW_SECONDS).isBefore(now)) {
                windowStartedAt = now;
                sendCount = 0;
            }
            if (sendCount >= MAX_RESET_OTP_SENDS) return;

            String otp = String.format(Locale.ROOT, "%04d", SECURE_RANDOM.nextInt(10_000));
            customer.setResetOtpHash(passwordEncoder.encode(otp));
            customer.setResetOtpExpiresAt(now.plusSeconds(RESET_OTP_EXPIRY_SECONDS));
            customer.setResetOtpWindowStartedAt(windowStartedAt);
            customer.setResetOtpSendCount(sendCount + 1);
            customer.setResetOtpAttempts(0);
            customer.setResetTokenHash(null);
            customer.setResetTokenExpiresAt(null);
            customer.setUpdatedAt(now);
            customers.save(customer);
            mailService.sendResetOtp(customer.getEmail(), otp);
        });
    }

    public String verifyPasswordResetOtp(String email, String otp) {
        CustomerUser customer = customers.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "OTP is invalid or expired"));
        Instant now = Instant.now();
        if (customer.getResetOtpHash() == null
                || customer.getResetOtpExpiresAt() == null
                || customer.getResetOtpExpiresAt().isBefore(now)
                || customer.getResetOtpAttempts() >= MAX_RESET_OTP_ATTEMPTS) {
            invalidateResetOtp(customer, now);
            customers.save(customer);
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP is invalid or expired");
        }

        if (!passwordEncoder.matches(otp, customer.getResetOtpHash())) {
            customer.setResetOtpAttempts(customer.getResetOtpAttempts() + 1);
            if (customer.getResetOtpAttempts() >= MAX_RESET_OTP_ATTEMPTS) {
                invalidateResetOtp(customer, now);
            }
            customer.setUpdatedAt(now);
            customers.save(customer);
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP is invalid or expired");
        }

        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String resetToken = HexFormat.of().formatHex(tokenBytes);
        invalidateResetOtp(customer, now);
        customer.setResetTokenHash(hash(resetToken));
        customer.setResetTokenExpiresAt(now.plusSeconds(RESET_OTP_EXPIRY_SECONDS));
        customer.setUpdatedAt(now);
        customers.save(customer);
        return resetToken;
    }

    public void resetPassword(String token, String newPassword) {
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be no more than 72 bytes");
        }

        CustomerUser customer = customers.findByResetTokenHash(hash(token))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Password reset session is invalid"));
        if (customer.getResetTokenExpiresAt() == null ||
                customer.getResetTokenExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password reset session has expired");
        }

        customer.setPasswordHash(passwordEncoder.encode(newPassword));
        customer.setResetTokenHash(null);
        customer.setResetTokenExpiresAt(null);
        customer.setResetOtpWindowStartedAt(null);
        customer.setResetOtpSendCount(0);
        customer.setFailedLoginAttempts(0);
        customer.setLockedUntil(null);
        customer.setUpdatedAt(Instant.now());
        customers.save(customer);
    }

    private void invalidateResetOtp(CustomerUser customer, Instant now) {
        customer.setResetOtpHash(null);
        customer.setResetOtpExpiresAt(null);
        customer.setResetOtpAttempts(0);
        customer.setUpdatedAt(now);
    }

    public List<OrderPublicResponse> orders(String email) {
        CustomerUser customer = findCustomer(email);
        return orders.findByCustomerIdOrderByCreatedAtDesc(customer.getId())
                .stream().map(OrderPublicResponse::from).toList();
    }

    public String customerIdForEmail(String email) {
        return findCustomer(email).getId();
    }

    private CustomerAuthResponse authResponse(CustomerUser customer) {
        return CustomerAuthResponse.from(
                jwtService.generateToken(customer.getEmail(), "CUSTOMER"), customer);
    }

    private CustomerUser findCustomer(String email) {
        CustomerUser customer = customers.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Customer account not found"));
        if (customer.isBlocked()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This customer account has been blocked");
        }
        return customer;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
