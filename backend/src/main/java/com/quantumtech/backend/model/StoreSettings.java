package com.quantumtech.backend.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("settings")
public class StoreSettings {
    @Id private String id = "store";
    private String storeName = "QuantumTech";
    private String tagline;
    private String taglineBn;
    private String slogan;
    private String phone;
    private String email;
    private String ownerNotificationEmail;
    private String bKashNumber;
    private String nagadNumber;
    private int deliveryChargeInsideDhaka = 70;
    private int deliveryChargeOutsideDhaka = 130;
    private int lowStockThreshold = 5;
    private String facebookUrl;
    private String instagramUrl;
    private String whatsappNumber;
    private String messengerUrl;
    private String address;
    private String businessHours;
    private String heroBadgeText;
    private String heroBadgeTextBn;
    private String heroTitleLine1;
    private String heroTitleLine1Bn;
    private String heroTitleLine2;
    private String heroTitleLine2Bn;
    private String heroSubtitle;
    private String heroSubtitleBn;
    private String heroBannerImage;
    private String heroBannerBadge;
    private String heroBannerBadgeBn;
    private String heroBannerTagline;
    private String heroBannerTaglineBn;
    private String heroPrimaryCtaText;
    private String heroPrimaryCtaTextBn;
    private String heroPrimaryCtaLink;
    private String heroSecondaryCtaText;
    private String heroSecondaryCtaTextBn;
    private String heroSecondaryCtaLink;
    private String heroRatingScore;
    private String heroRatingText;
    private String heroRatingTextBn;

    @JsonProperty("bKashNumber")
    public String getBKashNumber() {
        return bKashNumber;
    }

    @JsonProperty("bKashNumber")
    @JsonAlias("bkashNumber")
    public void setBKashNumber(String bKashNumber) {
        this.bKashNumber = bKashNumber;
    }
}
