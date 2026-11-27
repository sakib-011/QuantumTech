package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("notificationLogs")
public class NotificationLog {
    @Id private String id;
    private String orderId;
    private String channel = "Email";
    private String recipient;
    private int attemptNo;
    private String result;
    private String errorMessage;
    private Instant sentAt;
}
