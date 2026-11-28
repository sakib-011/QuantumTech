package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.ProductDiscount;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProductDiscountRepository extends MongoRepository<ProductDiscount, String> {}
