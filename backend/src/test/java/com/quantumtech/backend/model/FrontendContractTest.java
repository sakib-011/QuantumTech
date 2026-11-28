package com.quantumtech.backend.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FrontendContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void productFlagsUseFrontendV2PropertyNamesAndAcceptLegacyNames() throws Exception {
        Product product = new Product();
        product.setFeatured(true);
        product.setNew(true);

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(product));

        assertTrue(json.get("isFeatured").asBoolean());
        assertTrue(json.get("isNew").asBoolean());
        assertNull(json.get("featured"));
        assertNull(json.get("new"));

        Product legacy = objectMapper.readValue(
                "{\"featured\":true,\"new\":true}", Product.class);
        assertTrue(legacy.isFeatured());
        assertTrue(legacy.isNew());
    }

    @Test
    void reviewPrivacyAndVerifiedFlagMatchFrontendContract() throws Exception {
        Review review = new Review();
        review.setCustomerEmail("private@example.com");
        review.setVerifiedPurchase(true);

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(review));

        assertTrue(json.get("isVerifiedPurchase").asBoolean());
        assertNull(json.get("customerEmail"));
    }

    @Test
    void promotionFlagsAndHeroSettingsUseFrontendV2PropertyNames() throws Exception {
        PromotionalPopup popup = new PromotionalPopup();
        popup.setEnabled(true);
        ProductDiscount discount = new ProductDiscount();
        discount.setActive(true);
        Coupon coupon = new Coupon();
        coupon.setActive(true);
        StoreSettings settings = new StoreSettings();
        settings.setHeroTitleLine1("Gear up.");

        assertTrue(objectMapper.readTree(objectMapper.writeValueAsString(popup))
                .get("isEnabled").asBoolean());
        assertTrue(objectMapper.readTree(objectMapper.writeValueAsString(discount))
                .get("isActive").asBoolean());
        assertTrue(objectMapper.readTree(objectMapper.writeValueAsString(coupon))
                .get("isActive").asBoolean());
        assertEquals("Gear up.", objectMapper.readTree(objectMapper.writeValueAsString(settings))
                .get("heroTitleLine1").asText());
    }
}
