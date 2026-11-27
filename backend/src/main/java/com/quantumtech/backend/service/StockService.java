package com.quantumtech.backend.service;

import com.mongodb.client.result.UpdateResult;
import com.quantumtech.backend.model.Product;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Atomic stock reservation for checkout.
 *
 * <p>Each reservation is a single conditional MongoDB update ("decrement only if enough stock"),
 * so two customers can never buy the same last unit, even across several backend instances.
 * MongoDB transactions are not used (they require a replica set and a transaction manager);
 * instead a failed multi-item checkout releases the lines it already reserved.
 *
 * <p>For variant products the parent {@code stock} is decremented together with the variant,
 * keeping it equal to the sum of variant stocks.
 */
@Service
public class StockService {
    private static final Logger log = LoggerFactory.getLogger(StockService.class);
    /** Spring Data stores a nested property named {@code id} as {@code _id}. */
    static final String VARIANT_ID_FIELD = "_id";

    private final MongoTemplate mongo;

    public StockService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public record Reservation(String productId, String variantId, int quantity) {
        boolean hasVariant() {
            return variantId != null && !variantId.isBlank();
        }
    }

    /** @return true when the stock was available and has been decremented. */
    public boolean reserve(Reservation r) {
        if (r.quantity() < 1) throw new IllegalArgumentException("Quantity must be positive");
        Document filter = new Document("_id", r.productId())
                .append("status", new Document("$nin", List.of("Deleted", "Hidden")));
        Update update = new Update().inc("stock", -r.quantity());
        if (r.hasVariant()) {
            filter.append("variants", new Document("$elemMatch",
                    new Document(VARIANT_ID_FIELD, r.variantId())
                            .append("stock", new Document("$gte", r.quantity()))));
            update.inc("variants.$.stock", -r.quantity());
        } else {
            filter.append("stock", new Document("$gte", r.quantity()));
        }
        UpdateResult result = mongo.updateFirst(new BasicQuery(filter), update, Product.class);
        return result.getModifiedCount() == 1;
    }

    /** Returns previously reserved units, e.g. after a failed checkout or a cancellation. */
    public void release(Reservation r) {
        if (r.quantity() < 1) return;
        Document filter = new Document("_id", r.productId());
        Update update = new Update().inc("stock", r.quantity());
        if (r.hasVariant()) {
            filter.append("variants." + VARIANT_ID_FIELD, r.variantId());
            update.inc("variants.$.stock", r.quantity());
        }
        Query query = new BasicQuery(filter);
        UpdateResult result = mongo.updateFirst(query, update, Product.class);
        if (result.getMatchedCount() == 0) {
            log.warn("Could not restore {} unit(s) of product {} variant {}: product or variant no longer exists",
                    r.quantity(), r.productId(), r.variantId());
        }
    }

    public void releaseAll(List<Reservation> reservations) {
        for (Reservation r : reservations) {
            try {
                release(r);
            } catch (RuntimeException ex) {
                log.error("Failed to release stock reservation {}", r, ex);
            }
        }
    }
}
