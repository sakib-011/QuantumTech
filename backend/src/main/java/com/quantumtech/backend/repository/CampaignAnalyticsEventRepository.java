package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.CampaignAnalyticsEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CampaignAnalyticsEventRepository
        extends MongoRepository<CampaignAnalyticsEvent, String> {}
