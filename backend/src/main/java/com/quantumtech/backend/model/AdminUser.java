package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("adminUsers")
public class AdminUser {
    @Id private String id;
    private String name;
    private String email;
    private String passwordHash;
    private String role = "Owner";
    private String status = "Active";
    private int failedAttempts;
    private Instant lockedUntil;
    private Instant lastLoginAt;
    private String resetTokenHash;
    private Instant resetTokenExpiresAt;
}
