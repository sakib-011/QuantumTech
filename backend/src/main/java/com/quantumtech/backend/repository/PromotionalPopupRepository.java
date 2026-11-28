package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.PromotionalPopup;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PromotionalPopupRepository extends MongoRepository<PromotionalPopup, String> {}
