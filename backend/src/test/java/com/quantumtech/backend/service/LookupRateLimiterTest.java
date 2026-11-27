package com.quantumtech.backend.service;

import com.quantumtech.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class LookupRateLimiterTest {
    /** Clock that tests can move forward. */
    static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-11-23T10:00:00Z");

        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private final MutableClock clock = new MutableClock();
    private final LookupRateLimiter limiter = new LookupRateLimiter(3, Duration.ofMinutes(15), clock);

    @Test
    void blocksAfterLimitWithinWindow() {
        for (int i = 0; i < 3; i++) limiter.check("ip-1");
        ApiException ex = assertThrows(ApiException.class, () -> limiter.check("ip-1"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertEquals("RATE_LIMITED", ex.getDetails().get("code"));
        assertDoesNotThrow(() -> limiter.check("ip-2"), "limits are per client");
    }

    @Test
    void allowsAgainAfterWindowSlides() {
        for (int i = 0; i < 3; i++) limiter.check("ip-1");
        clock.now = clock.now.plus(Duration.ofMinutes(16));
        assertDoesNotThrow(() -> limiter.check("ip-1"));
    }

    @Test
    void evictsIdleClients() {
        limiter.check("ip-1");
        limiter.check("ip-2");
        assertEquals(2, limiter.trackedKeys());
        clock.now = clock.now.plus(Duration.ofMinutes(16));
        limiter.evictStale();
        assertEquals(0, limiter.trackedKeys());
    }

    @Test
    void nullKeyIsTreatedAsOneClient() {
        for (int i = 0; i < 3; i++) limiter.check(null);
        assertThrows(ApiException.class, () -> limiter.check(null));
    }
}
