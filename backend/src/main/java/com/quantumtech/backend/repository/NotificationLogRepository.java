package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.NotificationLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface NotificationLogRepository extends MongoRepository<NotificationLog, String> {}
