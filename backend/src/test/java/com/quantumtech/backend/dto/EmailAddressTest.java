package com.quantumtech.backend.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailAddressTest {
    @Test
    void acceptsCommonEmailAddressesAndRejectsMalformedLocalParts() {
        assertTrue("sakib@example.com".matches(EmailAddress.PATTERN));
        assertTrue("sakib+orders@example.co.uk".matches(EmailAddress.PATTERN));
        assertFalse("sakib#@gmail.com".matches(EmailAddress.PATTERN));
        assertFalse("sakib..shourovo@gmail.com".matches(EmailAddress.PATTERN));
    }
}
