package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.StoreSettings;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SettingsRepository extends MongoRepository<StoreSettings, String> {}
