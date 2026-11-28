package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("campaignAnalyticsEvents")
public class CampaignAnalyticsEvent {
    @Id private String id;
    private String campaignId;
    private String popupId;
    private String eventType;
    private String productId;
    private String couponCode;
    private String orderNumber;
    private Double revenue;
    private String pageUrl;
    private Instant timestamp;
}
