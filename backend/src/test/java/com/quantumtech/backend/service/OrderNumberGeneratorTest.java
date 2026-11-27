package com.quantumtech.backend.service;

import com.quantumtech.backend.model.OrderCounter;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class OrderNumberGeneratorTest {
    @Test
    void usesBangladeshDateAndZeroPaddedDailySequence() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        OrderCounter counter = new OrderCounter();
        counter.setSeq(7);
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(OrderCounter.class))).thenReturn(counter);
        // 20:00 UTC on 22 Nov is 02:00 on 23 Nov in Dhaka (UTC+6).
        Clock clock = Clock.fixed(Instant.parse("2026-11-22T20:00:00Z"), ZoneOffset.UTC);

        String number = new OrderNumberGenerator(mongo, clock).next();

        assertEquals("QT-261123-0007", number);
        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<FindAndModifyOptions> options = ArgumentCaptor.forClass(FindAndModifyOptions.class);
        verify(mongo).findAndModify(query.capture(), any(Update.class), options.capture(), eq(OrderCounter.class));
        assertTrue(query.getValue().getQueryObject().toJson().contains("order-261123"));
        assertTrue(options.getValue().isUpsert());
        assertTrue(options.getValue().isReturnNew());
    }
}
