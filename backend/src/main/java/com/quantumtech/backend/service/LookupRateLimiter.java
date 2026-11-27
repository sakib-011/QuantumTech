package com.quantumtech.backend.service;

import com.quantumtech.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window limiter for public order lookups (tracking, payment resubmission) so order
 * numbers cannot be brute-forced against phone numbers. Default: 10 attempts per 15 minutes
 * per client key. Stale keys are evicted periodically so memory does not grow without bound.
 */
@Component
public class LookupRateLimiter {
    private final int maxAttempts;
    private final Duration window;
    private final Clock clock;
    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    @Autowired
    public LookupRateLimiter(@Value("${app.tracking.max-attempts:10}") int maxAttempts,
                             @Value("${app.tracking.window-minutes:15}") long windowMinutes) {
        this(maxAttempts, Duration.ofMinutes(windowMinutes), Clock.systemUTC());
    }

    LookupRateLimiter(int maxAttempts, Duration window, Clock clock) {
        this.maxAttempts = maxAttempts;
        this.window = window;
        this.clock = clock;
    }

    /** Records an attempt for {@code key}, throwing 429 when the limit is exceeded. */
    public void check(String key) {
        Instant now = clock.instant();
        Deque<Instant> deque = attempts.computeIfAbsent(key == null ? "unknown" : key, k -> new ArrayDeque<>());
        synchronized (deque) {
            prune(deque, now);
            if (deque.size() >= maxAttempts) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Too many lookup attempts. Please wait " + window.toMinutes() + " minutes",
                        Map.of("code", "RATE_LIMITED"));
            }
            deque.addLast(now);
        }
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void evictStale() {
        Instant now = clock.instant();
        attempts.entrySet().removeIf(entry -> {
            Deque<Instant> deque = entry.getValue();
            synchronized (deque) {
                prune(deque, now);
                return deque.isEmpty();
            }
        });
    }

    int trackedKeys() {
        return attempts.size();
    }

    private void prune(Deque<Instant> deque, Instant now) {
        Instant cutoff = now.minus(window);
        while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) deque.removeFirst();
    }
}
