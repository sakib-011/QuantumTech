package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CartLine;
import com.quantumtech.backend.dto.CartQuote;
import com.quantumtech.backend.dto.CheckoutItemRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.ProductVariant;
import com.quantumtech.backend.model.StoreSettings;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.repository.SettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Prices a cart from the database. The storefront keeps the cart in the browser and calls this
 * whenever the cart is shown and right before checkout; checkout itself re-runs the same pricing,
 * so the amount the customer saw is the amount that gets charged.
 */
@Service
public class CartService {
    public static final String INSIDE_DHAKA = "Inside Dhaka";
    public static final String OUTSIDE_DHAKA = "Outside Dhaka";

    private final ProductRepository products;
    private final SettingsRepository settings;

    public CartService(ProductRepository products, SettingsRepository settings) {
        this.products = products;
        this.settings = settings;
    }

    public CartQuote quote(List<CheckoutItemRequest> items, String area) {
        if (items == null || items.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }
        if (area != null && !INSIDE_DHAKA.equals(area) && !OUTSIDE_DHAKA.equals(area)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Area must be Inside Dhaka or Outside Dhaka");
        }
        List<CheckoutItemRequest> merged = merge(items);
        Set<String> ids = merged.stream().map(CheckoutItemRequest::productId).collect(Collectors.toSet());
        Map<String, Product> byId = products.findAllById(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a));

        List<CartLine> lines = merged.stream().map(item -> price(item, byId.get(item.productId()))).toList();
        List<CartLine> okLines = lines.stream().filter(CartLine::isOk).toList();
        int subtotal = okLines.stream().mapToInt(CartLine::lineTotal).sum();
        int itemCount = okLines.stream().mapToInt(CartLine::quantity).sum();
        Integer delivery = area == null ? null : deliveryCharge(area);
        int total = subtotal + (delivery == null ? 0 : delivery);
        List<String> issues = lines.stream().filter(l -> !l.isOk()).map(CartLine::message).toList();

        return new CartQuote(issues.isEmpty(), area, lines, itemCount, subtotal, delivery, total, issues);
    }

    public int deliveryCharge(String area) {
        StoreSettings store = settings.findById("store").orElseGet(StoreSettings::new);
        return INSIDE_DHAKA.equals(area)
                ? store.getDeliveryChargeInsideDhaka()
                : store.getDeliveryChargeOutsideDhaka();
    }

    /** Combines repeated lines for the same product/variant so stock is checked on the total. */
    static List<CheckoutItemRequest> merge(List<CheckoutItemRequest> items) {
        Map<String, CheckoutItemRequest> merged = new LinkedHashMap<>();
        for (CheckoutItemRequest item : items) {
            if (item == null || item.productId() == null || item.productId().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each cart item needs a productId");
            }
            if (item.quantity() < 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Quantity must be at least 1");
            }
            String variantId = item.hasVariant() ? item.variantId().trim() : null;
            String key = item.productId().trim() + "|" + Objects.toString(variantId, "");
            CheckoutItemRequest previous = merged.get(key);
            int quantity = item.quantity() + (previous == null ? 0 : previous.quantity());
            if (quantity > CheckoutItemRequest.MAX_QUANTITY) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Quantity cannot exceed " + CheckoutItemRequest.MAX_QUANTITY + " per item");
            }
            merged.put(key, new CheckoutItemRequest(item.productId().trim(), variantId, quantity));
        }
        return new ArrayList<>(merged.values());
    }

    private CartLine price(CheckoutItemRequest item, Product product) {
        if (product == null || "Deleted".equals(product.getStatus()) || "Hidden".equals(product.getStatus())) {
            return unavailable(item, product, "This product is no longer available");
        }
        List<ProductVariant> variants = Objects.requireNonNullElse(product.getVariants(), List.of());
        String firstImage = product.getImages() == null || product.getImages().isEmpty()
                ? null : product.getImages().get(0);

        ProductVariant variant = null;
        if (item.hasVariant()) {
            variant = variants.stream().filter(v -> item.variantId().equals(v.getId())).findFirst().orElse(null);
            if (variant == null) {
                return unavailable(item, product, product.getName() + ": the selected option is no longer available");
            }
        } else if (!variants.isEmpty()) {
            return line(item, product, null, firstImage, product.getPrice(), 0, CartLine.VARIANT_REQUIRED,
                    "Please choose an option for " + product.getName());
        }

        int unitPrice = variant != null && variant.getPrice() > 0 ? variant.getPrice() : product.getPrice();
        int available = Math.max(0, variant != null ? variant.getStock() : product.getStock());
        String image = variant != null && variant.getImage() != null ? variant.getImage() : firstImage;

        if (available == 0) {
            return line(item, product, variant, image, unitPrice, 0, CartLine.OUT_OF_STOCK,
                    displayName(product, variant) + " is out of stock");
        }
        if (item.quantity() > available) {
            return line(item, product, variant, image, unitPrice, available, CartLine.INSUFFICIENT_STOCK,
                    displayName(product, variant) + ": only " + available + " left in stock");
        }
        return line(item, product, variant, image, unitPrice, available, CartLine.OK, null);
    }

    private CartLine line(CheckoutItemRequest item, Product product, ProductVariant variant, String image,
                          int unitPrice, int available, String status, String message) {
        Integer originalPrice = product.getOldPrice() != null && product.getOldPrice() > unitPrice
                ? product.getOldPrice() : null;
        return new CartLine(item.productId(), item.variantId(), product.getName(), product.getNameBn(),
                product.getSlug(), variant == null ? null : variant.getValue(), image, unitPrice,
                originalPrice, item.quantity(), available, unitPrice * item.quantity(), status, message);
    }

    private CartLine unavailable(CheckoutItemRequest item, Product product, String message) {
        return new CartLine(item.productId(), item.variantId(),
                product == null ? null : product.getName(), product == null ? null : product.getNameBn(),
                product == null ? null : product.getSlug(), null, null, 0, null,
                item.quantity(), 0, 0, CartLine.UNAVAILABLE, message);
    }

    private static String displayName(Product product, ProductVariant variant) {
        return variant == null || variant.getValue() == null
                ? product.getName() : product.getName() + " (" + variant.getValue() + ")";
    }
}
