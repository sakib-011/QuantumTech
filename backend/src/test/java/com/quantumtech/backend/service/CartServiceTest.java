package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CartLine;
import com.quantumtech.backend.dto.CartQuote;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.StoreSettings;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.repository.SettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.*;

import static com.quantumtech.backend.service.CheckoutFixtures.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CartServiceTest {
    private final ProductRepository products = mock(ProductRepository.class);
    private final SettingsRepository settings = mock(SettingsRepository.class);
    private final Map<String, Product> catalog = new HashMap<>();
    private final CartService cart = new CartService(products, settings);

    @BeforeEach
    void setUp() {
        when(settings.findById("store")).thenReturn(Optional.empty());
        when(products.findAllById(any())).thenAnswer(inv -> {
            List<Product> found = new ArrayList<>();
            for (Object id : (Iterable<?>) inv.getArgument(0)) {
                if (catalog.containsKey(id)) found.add(catalog.get(id));
            }
            return found;
        });
        catalog.put("p1", product("p1", 500, 10));
    }

    @Test
    void pricesValidCartWithDefaultDeliveryCharges() {
        CartQuote inside = cart.quote(List.of(item("p1", 2)), "Inside Dhaka");
        assertTrue(inside.valid());
        assertEquals(1000, inside.subtotal());
        assertEquals(70, inside.deliveryCharge());
        assertEquals(1070, inside.total());
        assertEquals(2, inside.itemCount());

        CartQuote outside = cart.quote(List.of(item("p1", 2)), "Outside Dhaka");
        assertEquals(130, outside.deliveryCharge());
        assertEquals(1130, outside.total());
    }

    @Test
    void usesConfiguredDeliveryCharges() {
        StoreSettings s = new StoreSettings();
        s.setDeliveryChargeInsideDhaka(60);
        when(settings.findById("store")).thenReturn(Optional.of(s));
        assertEquals(1060, cart.quote(List.of(item("p1", 2)), "Inside Dhaka").total());
    }

    @Test
    void withoutAreaDeliveryIsUnknown() {
        CartQuote quote = cart.quote(List.of(item("p1", 1)), null);
        assertNull(quote.deliveryCharge());
        assertEquals(500, quote.total());
    }

    @Test
    void mergesDuplicateLinesBeforeCheckingStock() {
        catalog.put("p1", product("p1", 500, 3));
        CartQuote quote = cart.quote(List.of(item("p1", 2), item("p1", 2)), null);
        assertEquals(1, quote.items().size());
        assertEquals(4, quote.items().get(0).quantity());
        assertEquals(CartLine.INSUFFICIENT_STOCK, quote.items().get(0).status());
        assertFalse(quote.valid());
        assertEquals(3, quote.items().get(0).availableStock());
    }

    @Test
    void rejectsMergedQuantityAboveLimit() {
        ApiException ex = assertThrows(ApiException.class,
                () -> cart.quote(List.of(item("p1", 6), item("p1", 5)), null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void flagsOutOfStockHiddenDeletedAndMissingProducts() {
        catalog.put("empty", product("empty", 100, 0));
        Product hidden = product("hidden", 100, 5);
        hidden.setStatus("Hidden");
        catalog.put("hidden", hidden);
        Product deleted = product("deleted", 100, 5);
        deleted.setStatus("Deleted");
        catalog.put("deleted", deleted);

        CartQuote quote = cart.quote(List.of(item("p1", 1), item("empty", 1), item("hidden", 1),
                item("deleted", 1), item("ghost", 1)), "Inside Dhaka");

        assertFalse(quote.valid());
        assertEquals(List.of("OK", "OUT_OF_STOCK", "UNAVAILABLE", "UNAVAILABLE", "UNAVAILABLE"),
                quote.items().stream().map(CartLine::status).toList());
        assertEquals(4, quote.issues().size());
        assertEquals(500, quote.subtotal(), "only OK lines count towards the subtotal");
        assertNull(quote.items().get(2).image(), "hidden product details are not leaked");
    }

    @Test
    void variantProductsRequireAVariantAndUseVariantPriceAndStock() {
        Product phoneCase = product("case", 300, 0);
        phoneCase.setOldPrice(450);
        phoneCase.getVariants().add(variant("red", "Red", 350, 2));
        phoneCase.getVariants().add(variant("blue", "Blue", 0, 5));
        phoneCase.getVariants().get(0).setImage("https://img/red.jpg");
        catalog.put("case", phoneCase);

        CartQuote quote = cart.quote(List.of(item("case", 1), item("case", "red", 2),
                item("case", "blue", 1), item("case", "green", 1)), null);

        List<CartLine> lines = quote.items();
        assertEquals(CartLine.VARIANT_REQUIRED, lines.get(0).status());
        assertEquals(CartLine.OK, lines.get(1).status());
        assertEquals(350, lines.get(1).unitPrice());
        assertEquals("Red", lines.get(1).variantName());
        assertEquals("https://img/red.jpg", lines.get(1).image());
        assertEquals(450, lines.get(1).originalPrice());
        assertEquals(300, lines.get(2).unitPrice(), "variant without own price falls back to product price");
        assertEquals("https://img/case.jpg", lines.get(2).image());
        assertEquals(CartLine.UNAVAILABLE, lines.get(3).status());
        assertEquals(1000, quote.subtotal());
    }

    @Test
    void rejectsInvalidAreaAndEmptyCart() {
        assertThrows(ApiException.class, () -> cart.quote(List.of(item("p1", 1)), "Mars"));
        assertThrows(ApiException.class, () -> cart.quote(List.of(), null));
        assertThrows(ApiException.class, () -> cart.quote(List.of(item("p1", 0)), null));
    }
}
