package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.CustomerUser;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CustomerUserRepository extends MongoRepository<CustomerUser, String> {
    Optional<CustomerUser> findByEmailIgnoreCase(String email);
    Optional<CustomerUser> findByResetTokenHash(String resetTokenHash);
    boolean existsByEmailIgnoreCase(String email);
}
