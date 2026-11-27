package com.quantumtech.backend.model;

import lombok.Data;
import java.time.Instant;

@Data
public class OrderStatusLog {
    private String id;
    private String orderId;
    private String fromStatus;
    private String toStatus;
    private String changedBy;
    private Instant changedAt;
    private String note;
}
