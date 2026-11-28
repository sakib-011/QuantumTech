package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

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
    @JsonProperty("isVerifiedPurchase")
    @JsonAlias("verifiedPurchase")
    private boolean isVerifiedPurchase;
    private String status = "Pending";
    private Instant createdAt;
    private Instant updatedAt;
    private String moderatedBy;
    private Instant moderatedAt;

    @JsonProperty("isVerifiedPurchase")
    public boolean isVerifiedPurchase() {
        return isVerifiedPurchase;
    }

    @JsonProperty("isVerifiedPurchase")
    public void setVerifiedPurchase(boolean verifiedPurchase) {
        this.isVerifiedPurchase = verifiedPurchase;
    }
}
