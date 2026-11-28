package com.quantumtech.backend.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Document("coupons")
public class Coupon {
    @Id private String id;
    private String code;
    private String offerTitle;
    private Integer minLifetimeDeliveredItems;
    private String discountType;
    private double discountValue;
    private Double minimumOrderValue;
    private Double maximumDiscount;
    private List<String> applicableProducts = new ArrayList<>();
    private List<String> applicableCategories = new ArrayList<>();
    private String campaignId;
    private Instant startDate;
    private Instant endDate;
    private int usageLimit;
    private int usedCount;
    private int perCustomerLimit = 1;
    @JsonProperty("isActive")
    @JsonAlias("active")
    private boolean isActive;
    private Instant createdAt;

    @JsonProperty("isActive")
    public boolean isActive() {
        return isActive;
    }

    @JsonProperty("isActive")
    public void setActive(boolean active) {
        this.isActive = active;
    }
}
