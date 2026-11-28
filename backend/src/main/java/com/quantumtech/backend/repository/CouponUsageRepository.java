package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.CouponUsage;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CouponUsageRepository extends MongoRepository<CouponUsage, String> {
    long countByCouponIdAndCustomerPhone(String couponId, String customerPhone);
}
