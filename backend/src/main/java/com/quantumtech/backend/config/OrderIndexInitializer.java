package com.quantumtech.backend.config;

import com.quantumtech.backend.model.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

/**
 * Creates the unique indexes that make checkout safe under concurrency:
 * one order per order number, per bKash/Nagad TrxID and per idempotency key.
 *
 * <p>Failures (for example duplicates already present in old data) are logged instead of
 * stopping the application; the service-level checks still apply in that case.
 */
@Component
public class OrderIndexInitializer {
    public static final String ORDER_NUMBER_INDEX = "orderNumber_unique";
    public static final String TRX_ID_INDEX = "trxId_unique";
    public static final String IDEMPOTENCY_INDEX = "idempotencyKey_unique";

    private static final Logger log = LoggerFactory.getLogger(OrderIndexInitializer.class);
    private final MongoTemplate mongo;

    public OrderIndexInitializer(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureIndexes() {
        IndexOperations ops = mongo.indexOps(Order.class);
        ensure(ops, new Index().on("orderNumber", Sort.Direction.ASC).unique().named(ORDER_NUMBER_INDEX));
        ensure(ops, new Index().on("trxId", Sort.Direction.ASC).unique().sparse().named(TRX_ID_INDEX));
        ensure(ops, new Index().on("idempotencyKey", Sort.Direction.ASC).unique().sparse().named(IDEMPOTENCY_INDEX));
        ensure(ops, new Index().on("status", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC)
                .named("status_createdAt"));
    }

    private void ensure(IndexOperations ops, Index index) {
        try {
            ops.ensureIndex(index);
        } catch (RuntimeException ex) {
            log.warn("Could not create orders index {}: {}", index.getIndexOptions().get("name"), ex.getMessage());
        }
    }
}
