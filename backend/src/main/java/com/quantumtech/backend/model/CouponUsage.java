package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("couponUsages")
public class CouponUsage {
    @Id private String id;
    private String couponId;
    private String couponCode;
    private String orderNumber;
    private String customerPhone;
    private double discountAmount;
    private Instant usedAt;
}
