package com.quantumtech.backend.config;

import com.quantumtech.backend.model.CustomerUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

@Component
public class CustomerIndexInitializer {
    private static final Logger log = LoggerFactory.getLogger(CustomerIndexInitializer.class);
    private final MongoTemplate mongo;

    public CustomerIndexInitializer(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureIndexes() {
        try {
            mongo.indexOps(CustomerUser.class)
                    .ensureIndex(new Index().on("email", Sort.Direction.ASC).unique().named("customer_email_unique"));
        } catch (RuntimeException ex) {
            log.warn("Could not create customer email index: {}", ex.getMessage());
        }
    }
}
