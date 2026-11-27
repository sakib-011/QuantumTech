package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByProductIdAndStatus(String productId, String status);
    List<Review> findByProductId(String productId);
}
