package com.quantumtech.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.quantumtech.backend.model.*;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.repository.SettingsRepository;
import com.quantumtech.backend.service.MailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.util.*;
import java.util.concurrent.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end checkout, payment and tracking flows over HTTP against a real MongoDB.
 * Covers the QA scenarios in docs/qa/TEST_PLAN.md (IDs in each @DisplayName).
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.tracking.max-attempts=10000",
        "app.admin.email=admin@quantumtech.com",
        "app.admin.password=test-only-admin-password",
        "app.jwt.secret=test-only-jwt-secret-for-integration-tests"
})
class CheckoutFlowIT extends EmbeddedMongoIntegrationTest {
    private static final String BKASH = "01811111111";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private MongoTemplate mongo;
    @Autowired private ProductRepository products;
    @Autowired private OrderRepository orders;
    @Autowired private SettingsRepository settings;
    @MockitoBean private MailService mailService;

    private String adminToken;

    @BeforeEach
    void seed() throws Exception {
        when(mailService.sendOwnerNotification(anyString(), any())).thenReturn(true);
        mongo.remove(new Query(), Order.class);
        mongo.remove(new Query(), Product.class);
        mongo.remove(new Query(), OrderCounter.class);
        mongo.remove(new Query(), StoreSettings.class);

        StoreSettings store = new StoreSettings();
        store.setBKashNumber(BKASH);
        store.setNagadNumber("01922222222");
        settings.save(store);

        products.save(product("charger", "65W Charger", 1500, 10));
        Product cable = product("cable", "USB-C Cable", 300, 0);
        cable.getVariants().add(variant("cable-1m", "1m", 300, 4));
        cable.getVariants().add(variant("cable-2m", "2m", 450, 1));
        cable.setStock(5);
        products.save(cable);

        if (adminToken == null) {
            MvcResult login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"admin@quantumtech.com\",\"password\":\"test-only-admin-password\"}"))
                    .andExpect(status().isOk()).andReturn();
            adminToken = JsonPath.read(login.getResponse().getContentAsString(), "$.token");
        }
    }

    // ------------------------------------------------------------------ helpers

    private static Product product(String id, String name, int price, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setSlug(id);
        p.setPrice(price);
        p.setStock(stock);
        p.setStatus("Active");
        p.setImages(new ArrayList<>(List.of("https://res.cloudinary.com/demo/" + id + ".jpg")));
        return p;
    }

    private static ProductVariant variant(String id, String value, int price, int stock) {
        ProductVariant v = new ProductVariant();
        v.setId(id);
        v.setProductId("cable");
        v.setAttribute("size");
        v.setValue(value);
        v.setPrice(price);
        v.setStock(stock);
        return v;
    }

    private static Map<String, Object> line(String productId, String variantId, int qty) {
        Map<String, Object> m = new HashMap<>();
        m.put("productId", productId);
        m.put("variantId", variantId);
        m.put("quantity", qty);
        return m;
    }

    private static Map<String, Object> checkout(String method, String trxId, List<Map<String, Object>> items) {
        Map<String, Object> body = new HashMap<>();
        body.put("customerName", "Rahim Uddin");
        body.put("phone", "01712345678");
        body.put("area", "Inside Dhaka");
        body.put("address", "House 12, Road 5, Dhanmondi");
        body.put("paymentMethod", method);
        body.put("language", "en");
        body.put("items", items);
        if (trxId != null) {
            body.put("trxId", trxId);
            body.put("senderNumber", "01712345678");
        }
        return body;
    }

    private ResultActions placeOrder(Map<String, Object> body, String idempotencyKey) throws Exception {
        var request = post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (idempotencyKey != null) request.header("X-Idempotency-Key", idempotencyKey);
        return mvc.perform(request);
    }

    private ResultActions admin(String method, String url, String body) throws Exception {
        var request = request(org.springframework.http.HttpMethod.valueOf(method), url)
                .header("Authorization", "Bearer " + adminToken);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(request);
    }

    private ResultActions track(String orderNumber, String phone) throws Exception {
        return mvc.perform(get("/api/orders/track").param("orderNumber", orderNumber).param("phone", phone));
    }

    private int stockOf(String productId) {
        return products.findById(productId).orElseThrow().getStock();
    }

    private int variantStock(String productId, String variantId) {
        return products.findById(productId).orElseThrow().getVariants().stream()
                .filter(v -> v.getId().equals(variantId)).findFirst().orElseThrow().getStock();
    }

    private static String read(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }

    // ------------------------------------------------------------------ cart

    @Test
    @DisplayName("TC-CART-01/02/03: cart validation prices server-side and flags stock problems")
    void cartValidation() throws Exception {
        String body = json.writeValueAsString(Map.of("area", "Outside Dhaka", "items", List.of(
                line("charger", null, 2), line("cable", "cable-2m", 3), line("cable", null, 1), line("ghost", null, 1))));
        mvc.perform(post("/api/cart/validate").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.items[0].status").value("OK"))
                .andExpect(jsonPath("$.items[0].unitPrice").value(1500))
                .andExpect(jsonPath("$.items[0].productName").value("65W Charger"))
                .andExpect(jsonPath("$.items[1].status").value("INSUFFICIENT_STOCK"))
                .andExpect(jsonPath("$.items[1].availableStock").value(1))
                .andExpect(jsonPath("$.items[2].status").value("VARIANT_REQUIRED"))
                .andExpect(jsonPath("$.items[3].status").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.subtotal").value(3000))
                .andExpect(jsonPath("$.deliveryCharge").value(130))
                .andExpect(jsonPath("$.total").value(3130))
                .andExpect(jsonPath("$.issues", hasSize(3)));
    }

    @Test
    @DisplayName("TC-CART-04: cart validation rejects quantity above limit and empty carts")
    void cartValidationLimits() throws Exception {
        mvc.perform(post("/api/cart/validate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"productId\":\"charger\",\"quantity\":11}]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/cart/validate").contentType(MediaType.APPLICATION_JSON).content("{\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.items").exists());
    }

    // ------------------------------------------------------------------ COD

    @Test
    @DisplayName("TC-COD-01..05: COD checkout, confirmation, tracking and full fulfilment")
    void codHappyPath() throws Exception {
        Map<String, Object> body = checkout("COD", null, List.of(line("charger", null, 2)));
        body.put("deliveryCharge", 0);          // tampered client values are ignored
        body.put("couponDiscount", 3000);
        MvcResult placed = placeOrder(body, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderNumber", matchesPattern("QT-\\d{6}-0001")))
                .andExpect(jsonPath("$.subtotal").value(3000))
                .andExpect(jsonPath("$.deliveryCharge").value(70))
                .andExpect(jsonPath("$.total").value(3070))
                .andExpect(jsonPath("$.paymentStatus").value("Pending collection"))
                .andExpect(jsonPath("$.status").value("Pending"))
                .andExpect(jsonPath("$.steps[0].current").value(true))
                .andExpect(jsonPath("$.idempotencyKey").doesNotExist())
                .andExpect(jsonPath("$.notificationStatus").doesNotExist())
                .andReturn();
        String orderNumber = read(placed, "$.orderNumber");
        String id = read(placed, "$.id");
        assertEquals(8, stockOf("charger"));

        track(orderNumber.toLowerCase(), "+8801712345678")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNumber").value(orderNumber))
                .andExpect(jsonPath("$.timeline", hasSize(1)))
                .andExpect(jsonPath("$.history[0].toStatus").value("Pending"));

        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Confirmed\"}").andExpect(status().isOk());
        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Shipped\",\"note\":\"Pathao\"}")
                .andExpect(status().isOk());
        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Delivered\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("Collected"));

        track(orderNumber, "01712345678")
                .andExpect(jsonPath("$.status").value("Delivered"))
                .andExpect(jsonPath("$.steps[*].completed", everyItem(is(true))))
                .andExpect(jsonPath("$.history[*].toStatus", contains("Pending", "Confirmed", "Shipped", "Delivered")))
                .andExpect(jsonPath("$.timeline[*].status", contains("Pending", "Confirmed", "Shipped", "Delivered")));

        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Cancelled\",\"reason\":\"x\"}")
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("TC-COD-06: cancelling an order restores stock exactly once")
    void cancellationRestoresStock() throws Exception {
        String id = read(placeOrder(checkout("COD", null, List.of(line("charger", null, 3))), null)
                .andExpect(status().isCreated()).andReturn(), "$.id");
        assertEquals(7, stockOf("charger"));

        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Cancelled\"}")
                .andExpect(status().isBadRequest());
        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Cancelled\",\"reason\":\"Customer request\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancellationReason").value("Customer request"))
                .andExpect(jsonPath("$.paymentStatus").value("Cancelled"));
        assertEquals(10, stockOf("charger"));

        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Cancelled\",\"reason\":\"again\"}")
                .andExpect(status().isConflict());
        assertEquals(10, stockOf("charger"));
    }

    // ------------------------------------------------------------------ variants / stock

    @Test
    @DisplayName("TC-STK-01/02: variant stock and parent stock are reserved and restored atomically")
    void variantStock() throws Exception {
        String id = read(placeOrder(checkout("COD", null, List.of(line("cable", "cable-1m", 3))), null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].variantName").value("1m"))
                .andExpect(jsonPath("$.items[0].unitPrice").value(300))
                .andReturn(), "$.id");
        assertEquals(1, variantStock("cable", "cable-1m"));
        assertEquals(1, variantStock("cable", "cable-2m"));
        assertEquals(2, stockOf("cable"));

        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Cancelled\",\"reason\":\"test\"}")
                .andExpect(status().isOk());
        assertEquals(4, variantStock("cable", "cable-1m"));
        assertEquals(5, stockOf("cable"));
    }

    @Test
    @DisplayName("TC-STK-03: invalid cart is rejected with a refreshed cart and no stock change")
    void invalidCartRejected() throws Exception {
        placeOrder(checkout("COD", null, List.of(line("charger", null, 2), line("cable", "cable-2m", 2))), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CART_INVALID"))
                .andExpect(jsonPath("$.cart.items[1].availableStock").value(1));
        assertEquals(10, stockOf("charger"));
        assertEquals(0, orders.count());
    }

    @Test
    @DisplayName("TC-STK-04: concurrent checkouts never oversell the last units")
    void concurrentCheckoutsDoNotOversell() throws Exception {
        Product limited = product("limited", "Limited Edition Power Bank", 2500, 5);
        products.save(limited);
        int buyers = 20;
        ExecutorService pool = Executors.newFixedThreadPool(buyers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < buyers; i++) {
            results.add(pool.submit(() -> {
                start.await();
                return placeOrder(checkout("COD", null, List.of(line("limited", null, 1))), null)
                        .andReturn().getResponse().getStatus();
            }));
        }
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> f : results) statuses.add(f.get(60, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(5, statuses.stream().filter(s -> s == 201).count(), statuses.toString());
        assertEquals(15, statuses.stream().filter(s -> s == 409).count(), statuses.toString());
        assertEquals(0, stockOf("limited"));
        assertEquals(5, orders.count());
        assertEquals(5, orders.findAll().stream().map(Order::getOrderNumber).distinct().count());
    }

    @Test
    @DisplayName("TC-STK-05: repeated submit with the same idempotency key creates one order")
    void idempotentCheckout() throws Exception {
        Map<String, Object> body = checkout("COD", null, List.of(line("charger", null, 1)));
        String first = read(placeOrder(body, "cart-abc-123").andExpect(status().isCreated()).andReturn(), "$.orderNumber");
        String second = read(placeOrder(body, "cart-abc-123").andExpect(status().isCreated()).andReturn(), "$.orderNumber");
        assertEquals(first, second);
        assertEquals(1, orders.count());
        assertEquals(9, stockOf("charger"));
    }

    @Test
    @DisplayName("TC-STK-06: client total that no longer matches is rejected with PRICE_CHANGED")
    void priceChanged() throws Exception {
        Map<String, Object> body = checkout("COD", null, List.of(line("charger", null, 1)));
        body.put("total", 1400);
        placeOrder(body, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PRICE_CHANGED"))
                .andExpect(jsonPath("$.cart.total").value(1570));
        body.put("total", 1570);
        placeOrder(body, null).andExpect(status().isCreated());
    }

    // ------------------------------------------------------------------ bKash / Nagad

    @Test
    @DisplayName("TC-PAY-01..07: bKash verification, failure, resubmission, confirmation, refund")
    void bkashLifecycle() throws Exception {
        MvcResult placed = placeOrder(checkout("bKash", "9k8j7h6g5f", List.of(line("charger", null, 1))), null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentStatus").value("Verification pending"))
                .andExpect(jsonPath("$.trxId").value("9K8J7H6G5F"))
                .andReturn();
        String id = read(placed, "$.id");
        String number = read(placed, "$.orderNumber");

        // Cannot confirm before verification.
        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Confirmed\"}")
                .andExpect(status().isConflict());
        // Admin cannot find the TrxID: Failed. Customer sees an action is required.
        admin("PATCH", "/api/admin/orders/" + id + "/payment", "{\"status\":\"Failed\",\"note\":\"Not in statement\"}")
                .andExpect(status().isOk());
        track(number, "01712345678").andExpect(jsonPath("$.paymentActionRequired").value(true));

        // Customer resubmits a corrected TrxID.
        mvc.perform(post("/api/orders/" + number + "/payment").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"01712345678\",\"trxId\":\"AB12CD34EF\",\"senderNumber\":\"01898765432\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("Verification pending"))
                .andExpect(jsonPath("$.trxId").value("AB12CD34EF"))
                .andExpect(jsonPath("$.paymentActionRequired").value(false));

        admin("PATCH", "/api/admin/orders/" + id + "/payment", "{\"status\":\"Verified\",\"note\":\"Matched\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("Verified"));
        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Confirmed\"}")
                .andExpect(status().isOk());
        // Verification is locked after confirmation.
        admin("PATCH", "/api/admin/orders/" + id + "/payment", "{\"status\":\"Failed\"}")
                .andExpect(status().isConflict());

        admin("PATCH", "/api/admin/orders/" + id + "/status", "{\"status\":\"Cancelled\",\"reason\":\"Out of stock at warehouse\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("Refund pending"));
        admin("GET", "/api/admin/dashboard", null).andExpect(jsonPath("$.refundPending").value(1));
        admin("PATCH", "/api/admin/orders/" + id + "/payment", "{\"status\":\"Refunded\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("Refunded"));
    }

    @Test
    @DisplayName("TC-PAY-08: a TrxID can only be used once (case-insensitive), across checkout and resubmission")
    void duplicateTrxId() throws Exception {
        placeOrder(checkout("Nagad", "NAGAD12345", List.of(line("charger", null, 1))), null)
                .andExpect(status().isCreated());
        placeOrder(checkout("bKash", "nagad12345", List.of(line("charger", null, 1))), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRXID_USED"));
        assertEquals(9, stockOf("charger"), "rejected checkout must not hold stock");

        MvcResult second = placeOrder(checkout("bKash", "BKASH99999", List.of(line("charger", null, 1))), null)
                .andExpect(status().isCreated()).andReturn();
        mvc.perform(post("/api/orders/" + read(second, "$.orderNumber") + "/payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"01712345678\",\"trxId\":\"NAGAD12345\",\"senderNumber\":\"01898765432\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRXID_USED"));
    }

    @Test
    @DisplayName("TC-PAY-09: wallet checkout needs TrxID + sender, and a configured receiving number")
    void walletValidation() throws Exception {
        placeOrder(checkout("bKash", null, List.of(line("charger", null, 1))), null)
                .andExpect(status().isBadRequest());
        mongo.remove(new Query(), StoreSettings.class);
        placeOrder(checkout("bKash", "9K8J7H6G5F", List.of(line("charger", null, 1))), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PAYMENT_METHOD_UNAVAILABLE"));
        mvc.perform(get("/api/payments/methods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("COD"))
                .andExpect(jsonPath("$[0].available").value(true))
                .andExpect(jsonPath("$[1].available").value(false));
    }

    @Test
    @DisplayName("TC-PAY-10: payment methods expose the store's receiving numbers and instructions")
    void paymentMethods() throws Exception {
        mvc.perform(get("/api/payments/methods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", contains("COD", "bKash", "Nagad")))
                .andExpect(jsonPath("$[1].merchantNumber").value(BKASH))
                .andExpect(jsonPath("$[1].requiresTrxId").value(true))
                .andExpect(jsonPath("$[1].instructionsBn", not(empty())));
    }

    // ------------------------------------------------------------------ tracking / validation / security

    @Test
    @DisplayName("TC-TRK-01..03: tracking requires the matching phone and validates input")
    void trackingSecurity() throws Exception {
        String number = read(placeOrder(checkout("COD", null, List.of(line("charger", null, 1))), null)
                .andReturn(), "$.orderNumber");
        track(number, "01799999999").andExpect(status().isNotFound());
        track("QT-000000-0000", "01712345678").andExpect(status().isNotFound());
        mvc.perform(get("/api/orders/track").param("orderNumber", number))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-VAL-01..04: request validation returns 400 with field details, never 500")
    void validation() throws Exception {
        Map<String, Object> body = checkout("COD", null, List.of(line("charger", null, 1)));
        body.put("phone", "12345");
        body.put("area", "Mars");
        placeOrder(body, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.phone").exists())
                .andExpect(jsonPath("$.fields.area").exists());

        Map<String, Object> noPhone = checkout("COD", null, List.of(line("charger", null, 1)));
        noPhone.remove("phone");
        placeOrder(noPhone, null).andExpect(status().isBadRequest());

        placeOrder(checkout("COD", null, List.of(line("charger", null, 0))), null)
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest());

        Map<String, Object> coupon = checkout("COD", null, List.of(line("charger", null, 1)));
        coupon.put("couponCode", "FREE");
        placeOrder(coupon, null).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COUPON_INVALID"));
    }

    @Test
    @DisplayName("TC-SEC-01/02: admin order endpoints require a valid JWT")
    void adminEndpointsAreProtected() throws Exception {
        mvc.perform(get("/api/admin/orders")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/admin/orders/x/payment").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"Verified\"}")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/orders").header("Authorization", "Bearer forged.token.value"))
                .andExpect(status().isUnauthorized());
        admin("GET", "/api/admin/orders?paymentStatus=Verification%20pending", null).andExpect(status().isOk());
    }

    @Test
    @DisplayName("TC-ORD-01: order numbers are sequential per day and unique")
    void orderNumbersAreSequential() throws Exception {
        String a = read(placeOrder(checkout("COD", null, List.of(line("charger", null, 1))), null).andReturn(), "$.orderNumber");
        String b = read(placeOrder(checkout("COD", null, List.of(line("charger", null, 1))), null).andReturn(), "$.orderNumber");
        assertTrue(a.endsWith("-0001"), a);
        assertTrue(b.endsWith("-0002"), b);
        assertEquals(a.substring(0, 10), b.substring(0, 10));
    }
}
