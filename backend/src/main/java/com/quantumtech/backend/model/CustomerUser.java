package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("customerUsers")
public class CustomerUser {
    @Id private String id;
    private String name;
    private String email;
    private String phone;
    private String deliveryArea;
    private String address;
    private String passwordHash;
    private int failedLoginAttempts;
    private Instant lockedUntil;
    private boolean blocked;
    private String resetTokenHash;
    private Instant resetTokenExpiresAt;
    private String resetOtpHash;
    private Instant resetOtpExpiresAt;
    private Instant resetOtpWindowStartedAt;
    private int resetOtpAttempts;
    private int resetOtpSendCount;
    private Instant createdAt;
    private Instant updatedAt;
}
