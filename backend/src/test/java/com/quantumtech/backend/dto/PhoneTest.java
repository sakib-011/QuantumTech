package com.quantumtech.backend.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhoneTest {
    @Test
    void acceptsBangladeshiMobilePrefixesAndCountryCodeFormats() {
        for (int prefix = 3; prefix <= 9; prefix++) {
            assertTrue(Phone.isValid("01" + prefix + "12345678"));
        }
        assertTrue(Phone.isValid("+880 17 1234-5678"));
        assertTrue(Phone.isValid("8801712345678"));
    }

    @Test
    void rejectsUnsupportedPrefixesAndInvalidLengths() {
        assertFalse(Phone.isValid("01212345678"));
        assertFalse(Phone.isValid("0171234567"));
        assertFalse(Phone.isValid("017123456789"));
    }
}
