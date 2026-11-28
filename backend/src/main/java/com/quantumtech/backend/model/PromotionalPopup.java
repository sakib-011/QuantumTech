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
@Document("promotionalPopups")
public class PromotionalPopup {
    @Id private String id;
    private String campaignId;
    private String internalName;
    private String layoutType;
    private String heading;
    private String subtitle;
    private String description;
    private String imageUrl;
    private String secondaryImageUrl;
    private String productId;
    private String productImage;
    private String badgeText;
    private String buttonText;
    private String buttonLink;
    private String secondaryButtonText;
    private String secondaryButtonLink;
    private String backgroundColor;
    private String textColor;
    private String buttonColor;
    private String imagePosition;
    private String textAlignment;
    private String triggerType;
    private int delaySeconds;
    private int scrollPercentage;
    private String frequency;
    private List<String> targetPages = new ArrayList<>();
    private List<String> excludedPages = new ArrayList<>();
    private boolean showOnDesktop = true;
    private boolean showOnMobile = true;
    private boolean showForNewVisitors = true;
    private boolean showForReturningVisitors = true;
    private Instant startDate;
    private Instant endDate;
    private int priority;
    @JsonProperty("isEnabled")
    @JsonAlias("enabled")
    private boolean isEnabled;
    private Instant createdAt;
    private Instant updatedAt;

    @JsonProperty("isEnabled")
    public boolean isEnabled() {
        return isEnabled;
    }

    @JsonProperty("isEnabled")
    public void setEnabled(boolean enabled) {
        this.isEnabled = enabled;
    }
}
