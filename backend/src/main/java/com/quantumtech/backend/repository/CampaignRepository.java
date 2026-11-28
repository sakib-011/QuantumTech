package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.Campaign;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CampaignRepository extends MongoRepository<Campaign, String> {
    Optional<Campaign> findByLandingPageSlug(String landingPageSlug);
}
