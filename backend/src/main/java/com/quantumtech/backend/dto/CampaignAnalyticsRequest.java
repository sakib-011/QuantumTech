package com.quantumtech.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record CampaignAnalyticsRequest(
        String campaignId,
        String popupId,
        @NotBlank String eventType,
        String productId,
        String couponCode,
        String orderNumber,
        Double revenue,
        String pageUrl
) {}
