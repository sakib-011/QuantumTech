package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.AdminUser;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AdminUserRepository extends MongoRepository<AdminUser, String> {
    Optional<AdminUser> findByEmailIgnoreCase(String email);
}
