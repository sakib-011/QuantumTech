package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends MongoRepository<Product, String> {
    Optional<Product> findBySlug(String slug);
    List<Product> findByStatus(String status);
    List<Product> findByCategoryIdAndStatus(String categoryId, String status);
}
