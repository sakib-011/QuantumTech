package com.quantumtech.backend.repository;

import com.quantumtech.backend.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends MongoRepository<Order, String> {
    Optional<Order> findByOrderNumberIgnoreCase(String orderNumber);
    Optional<Order> findByTrxIdIgnoreCase(String trxId);
    boolean existsByTrxIdIgnoreCase(String trxId);
    Optional<Order> findByIdempotencyKey(String idempotencyKey);
    List<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<Order> findByPhoneAndStatus(String phone, String status);
}
