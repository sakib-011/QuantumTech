package com.quantumtech.backend.service;

import com.quantumtech.backend.model.OrderCounter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Generates order numbers {@code QT-yyMMdd-NNNN} from an atomic per-day counter in the
 * {@code counters} collection. The date uses Bangladesh time so numbering resets at local midnight.
 *
 * <p>Replaces the previous {@code orders.count() + 1} scheme, which produced duplicates under
 * concurrent checkouts and never reset per day.
 */
@Component
public class OrderNumberGenerator {
    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Dhaka");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyMMdd", Locale.ENGLISH);

    private final MongoTemplate mongo;
    private final Clock clock;

    @Autowired
    public OrderNumberGenerator(MongoTemplate mongo) {
        this(mongo, Clock.system(STORE_ZONE));
    }

    OrderNumberGenerator(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    public String next() {
        String date = DATE.format(LocalDate.now(clock.withZone(STORE_ZONE)));
        OrderCounter counter = mongo.findAndModify(
                Query.query(Criteria.where("_id").is("order-" + date)),
                new Update().inc("seq", 1),
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                OrderCounter.class);
        long seq = counter == null ? 1 : counter.getSeq();
        return "QT-" + date + "-" + String.format(Locale.ENGLISH, "%04d", seq);
    }
}
