package com.quantumtech.backend.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Regression test for BUG-17:the bKash receiving number was dropped when sent as "bKashNumber". */
class StoreSettingsJsonTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void serializesBkashNumberOnceWithCamelCaseName() throws Exception {
        StoreSettings settings = new StoreSettings();
        settings.setBKashNumber("01811111111");
        String json = mapper.writeValueAsString(settings);
        assertTrue(json.contains("\"bKashNumber\":\"01811111111\""), json);
        assertFalse(json.contains("bkashNumber"), json);
    }

    @Test
    void acceptsBothSpellings() throws Exception {
        assertEquals("017", mapper.readValue("{\"bKashNumber\":\"017\"}", StoreSettings.class).getBKashNumber());
        assertEquals("018", mapper.readValue("{\"bkashNumber\":\"018\"}", StoreSettings.class).getBKashNumber());
    }
}
