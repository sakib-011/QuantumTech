package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CheckoutItemRequest;
import com.quantumtech.backend.dto.CreateOrderRequest;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.OrderItem;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.ProductVariant;
import com.quantumtech.backend.model.StoreSettings;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Shared builders for checkout/payment unit tests. */
final class CheckoutFixtures {
    static final String BKASH_NUMBER = "01811111111";
    static final String NAGAD_NUMBER = "01922222222";

    private CheckoutFixtures() {}

    static Product product(String id, int price, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setName("Product " + id);
        p.setSlug("product-" + id);
        p.setPrice(price);
        p.setStock(stock);
        p.setStatus("Active");
        p.setImages(new ArrayList<>(List.of("https://img/" + id + ".jpg")));
        return p;
    }

    static ProductVariant variant(String id, String value, int price, int stock) {
        ProductVariant v = new ProductVariant();
        v.setId(id);
        v.setAttribute("colour");
        v.setValue(value);
        v.setPrice(price);
        v.setStock(stock);
        return v;
    }

    static StoreSettings settingsWithWallets() {
        StoreSettings s = new StoreSettings();
        s.setBKashNumber(BKASH_NUMBER);
        s.setNagadNumber(NAGAD_NUMBER);
        return s;
    }

    static CheckoutItemRequest item(String productId, int qty) {
        return new CheckoutItemRequest(productId, null, qty);
    }

    static CheckoutItemRequest item(String productId, String variantId, int qty) {
        return new CheckoutItemRequest(productId, variantId, qty);
    }

    static CreateOrderRequest cod(List<CheckoutItemRequest> items) {
        return request("COD", null, null, null, items);
    }

    static CreateOrderRequest bkash(String trxId, List<CheckoutItemRequest> items) {
        return request("bKash", trxId, "01712345678", null, items);
    }

    static CreateOrderRequest request(String method, String trxId, String sender, Integer total,
                                      List<CheckoutItemRequest> items) {
        return new CreateOrderRequest("Rahim Uddin", "01712345678", "Inside Dhaka",
                "House 12, Road 5, Dhanmondi", "Call before delivery", null, 999, total,
                method, trxId, sender, null, 500, "Facebook", "en", items);
    }

    static Order order(String id, String status, String method, String paymentStatus) {
        Order o = new Order();
        o.setId(id);
        o.setOrderNumber("QT-261123-0001");
        o.setPhone("01712345678");
        o.setStatus(status);
        o.setPaymentMethod(method);
        o.setPaymentStatus(paymentStatus);
        o.setTotal(1070);
        o.setCreatedAt(Instant.now());
        o.setUpdatedAt(Instant.now());
        OrderItem item = new OrderItem();
        item.setProductId("p1");
        item.setQuantity(2);
        o.setItems(new ArrayList<>(List.of(item)));
        return o;
    }
}
