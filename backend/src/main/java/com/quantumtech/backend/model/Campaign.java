package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("campaigns")
public class Campaign {
    @Id private String id;
    private String name;
    private String nameBn;
    private String occasion;
    private String description;
    private String descriptionBn;
    private String campaignImage;
    private String desktopBanner;
    private String mobileBanner;
    private Instant startDate;
    private Instant endDate;
    private String status = "Draft";
    private int priority;
    private String popupId;
    private String bannerPosition = "none";
    private String customCtaText;
    private String customCtaLink;
    private String badgeText;
    private String landingPageSlug;
    private Boolean showCountdown;
    private Instant createdAt;
    private Instant updatedAt;
}
