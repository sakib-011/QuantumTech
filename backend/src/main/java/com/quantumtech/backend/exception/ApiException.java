package com.quantumtech.backend.exception;

import org.springframework.http.HttpStatus;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final Map<String, Object> details;

    public ApiException(HttpStatus status, String message) {
        this(status, message, Map.of());
    }

    /**
     * @param details extra machine-readable fields merged into the JSON error body,
     *                e.g. {@code code} and a refreshed {@code cart} for checkout failures.
     */
    public ApiException(HttpStatus status, String message, Map<String, Object> details) {
        super(message);
        this.status = status;
        this.details = details == null ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(details));
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}
