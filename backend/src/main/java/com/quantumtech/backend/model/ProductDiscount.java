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
@Document("productDiscounts")
public class ProductDiscount {
    @Id private String id;
    private String name;
    private String campaignId;
    private String discountType;
    private double discountValue;
    private String targetType;
    private List<String> categoryIds = new ArrayList<>();
    private List<DiscountProductItem> productItems = new ArrayList<>();
    private Instant startDate;
    private Instant endDate;
    private Integer minStockRequirement;
    private Double maxDiscountAmount;
    private int priority;
    @JsonProperty("isActive")
    @JsonAlias("active")
    private boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;

    @JsonProperty("isActive")
    public boolean isActive() {
        return isActive;
    }

    @JsonProperty("isActive")
    public void setActive(boolean active) {
        this.isActive = active;
    }
}
