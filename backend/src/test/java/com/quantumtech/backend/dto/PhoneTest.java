package com.quantumtech.backend.dto;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class PhoneTest {
    @ParameterizedTest
    @ValueSource(strings = {"01712345678", "+8801712345678", "8801712345678", "017-1234-5678", "017 1234 5678"})
    void acceptsCommonFormats(String raw) {
        assertTrue(Phone.isValid(raw));
        assertEquals("01712345678", Phone.normalize(raw));
    }

    @ParameterizedTest
    @ValueSource(strings = {"01212345678", "0171234567", "017123456789", "abc", "", "+1 555 123 4567"})
    void rejectsInvalidNumbers(String raw) {
        assertFalse(Phone.isValid(raw));
    }

    @Test
    void nullIsInvalid() {
        assertFalse(Phone.isValid(null));
        assertNull(Phone.normalize(null));
    }

    @Test
    void annotationPatternMatchesSameNumbers() {
        assertTrue("+8801712345678".matches(Phone.PATTERN));
        assertTrue("01912345678".matches(Phone.PATTERN));
        assertFalse("01112345678".matches(Phone.PATTERN));
    }
}
