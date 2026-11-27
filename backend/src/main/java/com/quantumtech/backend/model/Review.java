package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@Document("reviews")
public class Review {
    @Id private String id;
    private String productId;
    private String productName;
    private String reviewerName;
    @JsonIgnore
    private String customerEmail;
    private String orderId;
    private String orderNumber;
    private int rating;
    private String title;
    private String comment;
    private List<String> images;
    private boolean isVerifiedPurchase;
    private String status = "Pending";
    private Instant createdAt;
    private Instant updatedAt;
    private String moderatedBy;
    private Instant moderatedAt;
}
