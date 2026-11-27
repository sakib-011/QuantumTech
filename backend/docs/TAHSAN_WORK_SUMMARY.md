# Checkout, Payment & QA — Work Summary

**Owner:** Tahsan Mohammad (Checkout, Payment & QA), Team Beryllium
**Project:** QuantumTech E-Commerce Website · Sprint 21 Nov – 3 Dec 2026
**Repository:** QuantumTechBackend (Spring Boot 3.4, Java 21, MongoDB)

This document explains what was built for the checkout/payment/QA responsibility, how to run and
access it, and every customer and admin flow end to end with example requests.

| Document | Purpose |
|---|---|
| **This file** | Overview, how to run, all flows |
| [checkout-payment-integration.md](checkout-payment-integration.md) | Detailed API contract for the frontend (fields, responses, UI states, error codes) |
| [qa/TEST_PLAN.md](qa/TEST_PLAN.md) | Test strategy, test case IDs, manual E2E cases, release criteria |
| [qa/BUG_REPORT.md](qa/BUG_REPORT.md) | 24 defects found in the existing order flow, fixes and regression tests |
| [qa/QuantumTech-Checkout.postman_collection.json](qa/QuantumTech-Checkout.postman_collection.json) | Ready-to-run Postman collection for manual QA |

---

## 1. What was done

### 1.1 Responsibilities and deliverables

| Responsibility (kickoff document) | Delivered |
|---|---|
| Develop cart | `POST /api/cart/validate`: server-side pricing of the browser cart, stock and availability checks per line, delivery charge and total |
| Guest checkout and order processing | Hardened `POST /api/orders`: server-side pricing, atomic stock reservation with rollback, idempotency, price-change detection, daily order numbers, strict validation |
| COD, bKash and Nagad payment workflows | `GET /api/payments/methods` (EN/BN instructions, receiving numbers), payment verification rules, customer TrxID resubmission, refund tracking, COD collection |
| Order confirmation and tracking | Customer-safe `OrderPublicResponse` (progress `steps`, `timeline`, payment badge info) for checkout and tracking; rate-limited tracking |
| Integration testing, bug reporting and QA | 17 integration tests on a real embedded MongoDB, 85 unit tests, test plan, bug report (23 fixed, 1 open, 6 observations), Postman collection |

### 1.2 New API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/cart/validate` | Public | Re-price cart, flag stock problems, compute totals |
| GET | `/api/payments/methods` | Public | COD/bKash/Nagad availability, receiving numbers, step-by-step instructions |
| POST | `/api/orders/{orderNumber}/payment` | Public | Customer resubmits bKash/Nagad TrxID |

### 1.3 Changed API behaviour

| Endpoint | Change |
|---|---|
| `POST /api/orders` | Returns the customer-safe order confirmation; ignores client prices/discounts; `409` codes `CART_INVALID`, `PRICE_CHANGED`, `OUT_OF_STOCK`, `TRXID_USED`; coupons rejected (`COUPON_INVALID`) |
| `GET /api/orders/track` | Returns customer-safe view with `steps` and `timeline`; accepts any phone format; bad input gives `400`/`404` instead of `500` |
| `PATCH /api/admin/orders/{id}/payment` | Adds `Refunded`; Verify/Fail only while order is Pending |
| `PATCH /api/admin/orders/{id}/status` | Cancelling a verified wallet payment sets `Refund pending`; delivering COD sets `Collected`; concurrent edits return `409 CONCURRENT_UPDATE` |
| `GET /api/admin/orders` | New `paymentStatus` filter; search also matches TrxID |
| `GET /api/admin/dashboard` | New `paymentVerificationPending` and `refundPending` counts |
| All admin endpoints | Missing/invalid token returns `401` (as documented) |
| Store settings JSON | bKash number field is `bKashNumber` (old `bkashNumber` still accepted) |

### 1.4 Code map

```
src/main/java/com/quantumtech/backend/
├── controller/
│   ├── CheckoutController.java      NEW  cart validation, payment methods, TrxID resubmission
│   └── OrderController.java         CHG  public responses, payment via PaymentService, paymentStatus filter
├── service/
│   ├── CartService.java             NEW  server-side cart pricing (shared by cart + checkout)
│   ├── StockService.java            NEW  atomic stock reserve/release (no overselling)
│   ├── OrderNumberGenerator.java    NEW  QT-yyMMdd-NNNN daily counter (Asia/Dhaka)
│   ├── PaymentMethodCatalog.java    NEW  COD/bKash/Nagad options + EN/BN instructions
│   ├── PaymentService.java          NEW  verify / fail / refund / customer resubmission
│   ├── LookupRateLimiter.java       NEW  10 lookups / 15 min per IP, with eviction
│   ├── OrderService.java            CHG  checkout pipeline, tracking, status lifecycle (compare-and-set)
│   └── NotificationService.java     CHG  atomic notification-status update (no lost admin edits)
├── dto/
│   ├── CheckoutItemRequest, CartValidationRequest, CartLine, CartQuote          NEW
│   ├── OrderPublicResponse, PaymentMethodInfo, PaymentResubmitRequest, Phone    NEW
│   └── CreateOrderRequest, OrderStatusRequest, PaymentStatusRequest             CHG  validation
├── model/
│   ├── OrderStatus, PaymentMethod, PaymentStatus   NEW  lifecycle constants and rules
│   ├── OrderCounter                                NEW  per-day order sequence
│   └── StoreSettings                               CHG  bKashNumber JSON name
├── config/
│   ├── OrderIndexInitializer.java   NEW  unique indexes: orderNumber, trxId, idempotencyKey
│   └── SecurityConfig.java          CHG  new public routes, 401 entry point
└── exception/                       CHG  error `code`/`cart` details; framework errors no longer 500

src/test/java/com/quantumtech/backend/
├── integration/CheckoutFlowIT.java + EmbeddedMongoIntegrationTest.java    17 end-to-end tests
├── service/  OrderServiceTest, CartServiceTest, PaymentServiceTest,
│             LookupRateLimiterTest, OrderNumberGeneratorTest, CheckoutFixtures
├── dto/      OrderPublicResponseTest, PhoneTest
└── model/    StoreSettingsJsonTest
```

Build changes (`pom.xml`): embedded MongoDB test dependency, Failsafe plugin for `*IT` tests,
explicit Lombok annotation processor (required on JDK 23+).

---

## 2. How to run and access

### 2.1 Prerequisites

* JDK 21 or newer, Maven 3.9+
* MongoDB: local (`mongodb://localhost:27017/qtechdb`) or Atlas

### 2.2 Configuration

Copy `.env.example` and set the values as environment variables (Spring Boot does not read `.env`
on its own). Relevant to checkout:

| Variable | Default | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/qtechdb` | Atlas: `mongodb+srv://USER:PASS@CLUSTER/qtechdb` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Required environment variables | Admin account created on first start; no built-in credentials |
| `JWT_SECRET` | Required environment variable | Set a long random value before starting the application |
| `TRACKING_MAX_ATTEMPTS` / `TRACKING_WINDOW_MINUTES` | `10` / `15` | Public lookup rate limit |
| `FORWARD_HEADERS_STRATEGY` | `none` | Set `framework` behind Render/Railway/Nginx |

### 2.3 Start the server

```bash
mvn spring-boot:run
```

| Access point | URL |
|---|---|
| API base | `http://localhost:8080` |
| Swagger UI (try every endpoint in the browser) | `http://localhost:8080/swagger-ui` |
| OpenAPI JSON | `http://localhost:8080/api-docs` |

### 2.4 One-time store setup (admin)

bKash and Nagad only appear at checkout after their receiving numbers are configured.

```bash
# 1. Log in and keep the token
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}'
# -> {"token":"<JWT>", ...}
TOKEN=<JWT>

# 2. Set receiving numbers and delivery charges
curl -s -X PUT http://localhost:8080/api/admin/settings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"storeName":"QuantumTech","bKashNumber":"01811111111","nagadNumber":"01922222222",
       "deliveryChargeInsideDhaka":70,"deliveryChargeOutsideDhaka":130,"lowStockThreshold":5}'
```

Products are created by the admin (`POST /api/admin/products`, Sifat's API). The examples below
assume a product id `PRODUCT_ID` priced 1500 BDT with stock.

### 2.5 Postman

Import `docs/qa/QuantumTech-Checkout.postman_collection.json`, set the collection variables
`baseUrl` and `productId`, run **0. Admin login**, then run the folders in order. Each request
has assertions and saves `orderId` / `orderNumber` for the next one.

### 2.6 Tests

```bash
mvn test     # 85 unit tests, no database needed
mvn verify   # unit tests + 17 integration tests on an embedded MongoDB 7
```

The first `mvn verify` downloads MongoDB into `~/.embedmongo` (no Docker needed). Last result:
**85/85 unit and 17/17 integration tests passing on JDK 21 (BUILD SUCCESS).**

---

## 3. Status reference

### Order status

```mermaid
stateDiagram-v2
    [*] --> Pending: customer places order
    Pending --> Confirmed: admin (wallet must be Verified)
    Confirmed --> Shipped: admin
    Shipped --> Delivered: admin
    Pending --> Cancelled: admin + reason
    Confirmed --> Cancelled: admin + reason
    Shipped --> Cancelled: admin + reason
    Delivered --> [*]
    Cancelled --> [*]
```

Cancelling restores stock (exactly once). `Delivered` and `Cancelled` are final.

### Payment status

```mermaid
stateDiagram-v2
    state "COD" as cod {
        PendingCollection: Pending collection
        [*] --> PendingCollection
        PendingCollection --> Collected: order Delivered
        PendingCollection --> CancelledPay: order Cancelled
        CancelledPay: Cancelled
    }
    state "bKash / Nagad" as wallet {
        VP: Verification pending
        [*] --> VP
        VP --> Verified: admin (order Pending)
        VP --> Failed: admin (order Pending)
        Failed --> VP: customer resubmits TrxID
        Failed --> Verified: admin re-checks
        Verified --> RefundPending: order Cancelled
        RefundPending: Refund pending
        RefundPending --> Refunded: admin
    }
```

---

## 4. Full flows

All examples use `BASE=http://localhost:8080`, `TOKEN` from §2.4 and `PRODUCT_ID` priced 1500 BDT.

### Flow A: Cart (storefront)

The cart is stored in the browser as `[{productId, variantId, quantity}]` only. The server is
asked for prices and stock every time the cart is shown and before checkout.

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Storefront
    participant API as Backend
    C->>FE: Add to cart / change quantity / choose area
    FE->>FE: Save {productId, variantId, quantity} in localStorage
    FE->>API: POST /api/cart/validate
    API-->>FE: lines with price, stock status, subtotal, delivery, total, valid
    FE-->>C: Show cart; disable "Place order" if valid=false
```

```bash
curl -s -X POST $BASE/api/cart/validate -H "Content-Type: application/json" \
  -d '{"area":"Inside Dhaka","items":[{"productId":"PRODUCT_ID","quantity":2}]}'
```

```json
{ "valid": true, "area": "Inside Dhaka",
  "items": [{ "productId": "PRODUCT_ID", "productName": "65W Charger", "unitPrice": 1500,
              "quantity": 2, "availableStock": 10, "lineTotal": 3000, "status": "OK", "message": null }],
  "itemCount": 2, "subtotal": 3000, "deliveryCharge": 70, "total": 3070, "issues": [] }
```

Line statuses: `OK`, `INSUFFICIENT_STOCK` (shows `availableStock`), `OUT_OF_STOCK`,
`UNAVAILABLE` (hidden/deleted/option removed), `VARIANT_REQUIRED` (product has options but none chosen).
Limits: 1–10 per line, max 50 lines; duplicate lines are merged.

### Flow B: Cash on Delivery, from order to delivery

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Storefront
    participant API as Backend
    actor A as Admin
    FE->>API: GET /api/payments/methods
    C->>FE: Fill name, phone, area, address; choose COD
    FE->>API: POST /api/orders (X-Idempotency-Key)
    API->>API: re-price cart, reserve stock atomically, order no. QT-yyMMdd-NNNN
    API-->>FE: 201 order confirmation (Pending / Pending collection)
    API--)A: owner email "New QuantumTech order"
    A->>API: PATCH status Confirmed
    A->>API: PATCH status Shipped
    A->>API: PATCH status Delivered (payment becomes Collected)
    C->>FE: Track order
    FE->>API: GET /api/orders/track
    API-->>FE: steps all completed, timeline
```

**1. Place the order**

```bash
curl -s -X POST $BASE/api/orders \
  -H "Content-Type: application/json" -H "X-Idempotency-Key: 6f1c2a9e-1111-4c1e-9b1a-000000000001" \
  -d '{"customerName":"Rahim Uddin","phone":"01712345678","area":"Inside Dhaka",
       "address":"House 12, Road 5, Dhanmondi","note":"Call before delivery",
       "paymentMethod":"COD","total":3070,"language":"en",
       "items":[{"productId":"PRODUCT_ID","quantity":2}]}'
```

Response `201` (order confirmation):

```json
{ "id": "ORDER_ID", "orderNumber": "QT-261123-0001", "status": "Pending",
  "paymentMethod": "COD", "paymentStatus": "Pending collection",
  "subtotal": 3000, "deliveryCharge": 70, "total": 3070,
  "items": [{ "productName": "65W Charger", "unitPrice": 1500, "quantity": 2, "lineTotal": 3000 }],
  "steps": [{ "status": "Pending", "completed": true, "current": true, "at": "…" },
            { "status": "Confirmed", "completed": false, "current": false, "at": null },
            { "status": "Shipped", "completed": false, "current": false, "at": null },
            { "status": "Delivered", "completed": false, "current": false, "at": null }],
  "timeline": [{ "status": "Pending", "at": "…" }], "paymentActionRequired": false }
```

* Stock for `PRODUCT_ID` drops by 2.
* Sending the same request again with the same `X-Idempotency-Key` returns the **same** order
  (no duplicate, no second stock deduction).
* If `total` no longer matches (price or delivery changed), you get `409 PRICE_CHANGED` with the fresh `cart`.

**2. Admin processes the order**

```bash
curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Confirmed","note":"Called customer"}'
curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Shipped","note":"Handed to Pathao"}'
curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Delivered"}'
# -> "status":"Delivered", "paymentStatus":"Collected"
```

**3. Customer tracks the order**

```bash
curl -s "$BASE/api/orders/track?orderNumber=QT-261123-0001&phone=01712345678"
# all four steps completed; timeline Pending, Confirmed, Shipped, Delivered
```

### Flow C: bKash / Nagad payment (happy path)

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Storefront
    participant API as Backend
    actor A as Admin
    FE->>API: GET /api/payments/methods
    API-->>FE: bKash merchantNumber + EN/BN steps
    C->>C: Send Money (total) to merchant number, note TrxID
    C->>FE: Enter TrxID + sender number, place order
    FE->>API: POST /api/orders
    API-->>FE: 201 (Pending / Verification pending)
    A->>API: GET /api/admin/orders?paymentStatus=Verification pending
    A->>A: Check wallet statement for TrxID + amount
    A->>API: PATCH payment Verified
    A->>API: PATCH status Confirmed, then Shipped, then Delivered
```

**1. Payment instructions**

```bash
curl -s $BASE/api/payments/methods
# [ {"code":"COD",...},
#   {"code":"bKash","available":true,"requiresTrxId":true,"merchantNumber":"01811111111",
#    "instructions":["Open the bKash app or dial *247#.", "Choose \"Send Money\" ..."],
#    "instructionsBn":["বিকাশ অ্যাপ খুলুন ..."]},
#   {"code":"Nagad",...} ]
```

**2. Place the order with TrxID**

```bash
curl -s -X POST $BASE/api/orders -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: 6f1c2a9e-2222-4c1e-9b1a-000000000002" \
  -d '{"customerName":"Rahim Uddin","phone":"01712345678","area":"Outside Dhaka",
       "address":"Agrabad, Chattogram","paymentMethod":"bKash",
       "trxId":"9K8J7H6G5F","senderNumber":"01712345678",
       "items":[{"productId":"PRODUCT_ID","quantity":1}]}'
# -> 201, "paymentStatus":"Verification pending", "trxId":"9K8J7H6G5F", total 1630
```

Rules: TrxID 8–12 letters/digits (stored upper-case), unique across all orders
(`409 TRXID_USED`, case-insensitive); sender number must be a valid mobile number; the method
must have a receiving number configured (`400 PAYMENT_METHOD_UNAVAILABLE`).

**3. Admin verification queue, verify, then confirm**

```bash
curl -s "$BASE/api/admin/orders?paymentStatus=Verification%20pending" -H "Authorization: Bearer $TOKEN"

curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Confirmed"}'
# -> 409 "bKash/Nagad payment must be Verified before confirmation"

curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/payment -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Verified","note":"Matched statement"}'
curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Confirmed"}'
# then Shipped and Delivered as in Flow B
```

Nagad works the same way with `"paymentMethod":"Nagad"` (USSD `*167#`).

### Flow D: Failed payment and customer resubmission

Used when the customer mistyped the TrxID or the admin cannot find the payment.

```mermaid
sequenceDiagram
    actor C as Customer
    participant API as Backend
    actor A as Admin
    A->>API: PATCH payment Failed ("TrxID not in statement")
    C->>API: GET /api/orders/track
    API-->>C: paymentStatus Failed, paymentActionRequired true
    C->>API: POST /api/orders/{orderNumber}/payment (phone, new TrxID, sender)
    API-->>C: paymentStatus Verification pending
    A->>API: PATCH payment Verified
    A->>API: PATCH status Confirmed
```

```bash
curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/payment -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Failed","note":"TrxID not in statement"}'

curl -s "$BASE/api/orders/track?orderNumber=QT-261123-0002&phone=01712345678"
# -> "paymentStatus":"Failed", "paymentActionRequired":true

curl -s -X POST $BASE/api/orders/QT-261123-0002/payment -H "Content-Type: application/json" \
  -d '{"phone":"01712345678","trxId":"AB12CD34EF","senderNumber":"01898765432"}'
# -> "paymentStatus":"Verification pending", "trxId":"AB12CD34EF"
```

Resubmission is allowed only while the order is `Pending` and payment is `Verification pending`
or `Failed`. The phone must match the order (`404` otherwise). The new TrxID must differ from the
current one (`409 TRXID_UNCHANGED`) and be unused (`409 TRXID_USED`). Rate-limited like tracking.

### Flow E: Cancellation, stock restore and refund

```mermaid
sequenceDiagram
    actor A as Admin
    participant API as Backend
    participant DB as Products
    A->>API: PATCH status Cancelled (reason required)
    API->>API: compare-and-set (blocks double cancel)
    API->>DB: restore stock once
    alt wallet payment was Verified
        API-->>A: paymentStatus Refund pending
        A->>A: Send money back to customer
        A->>API: PATCH payment Refunded
    else COD
        API-->>A: paymentStatus Cancelled
    end
```

```bash
curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Cancelled"}'
# -> 400 "A cancellation reason is required"

curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Cancelled","reason":"Customer request"}'
# -> "status":"Cancelled", "paymentStatus":"Refund pending" (verified bKash) ; stock restored

curl -s $BASE/api/admin/dashboard -H "Authorization: Bearer $TOKEN"
# -> "refundPending":1, "paymentVerificationPending":…

curl -s -X PATCH $BASE/api/admin/orders/ORDER_ID/payment -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"Refunded","note":"Sent back via bKash"}'
```

Customers see the cancellation on the tracking page: reached steps, a `Cancelled` timeline entry
and `cancellationReason`.

### Flow F: Order tracking (customer)

```bash
curl -s "$BASE/api/orders/track?orderNumber=qt-261123-0001&phone=+8801712345678"
```

* Order number is case-insensitive; phone accepts `01712345678`, `+8801712345678`,
  `017-1234-5678`, `017 1234 5678`.
* Wrong phone and unknown order both return the same `404` (no information leak).
* More than 10 lookups in 15 minutes from one IP returns `429 RATE_LIMITED`.
* The response never contains admin notes, idempotency keys or notification status.

### Flow G: Safety behaviour (what QA verified)

| Scenario | Result |
|---|---|
| 20 customers buy a product with 5 units at the same moment | Exactly 5 orders, stock 0, 15 × `409 OUT_OF_STOCK`/`CART_INVALID` |
| Double-click / network retry with same idempotency key | One order, stock deducted once |
| Cart line becomes invalid during checkout | `409 CART_INVALID` + refreshed cart, nothing reserved |
| A later line fails after earlier lines were reserved | Earlier reservations released |
| Tampered `deliveryCharge`, `couponDiscount`, item prices | Ignored, server values used |
| Same TrxID twice (any letter case) | `409 TRXID_USED` |
| Two admins cancel the same order | Second gets `409 CONCURRENT_UPDATE`, stock restored once |
| Malformed JSON / missing parameters / bad phone | `400` with field details (previously `500`) |

---

## 5. Error codes for the frontend

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | (has `fields`) | Field validation failed |
| 400 | `PAYMENT_DETAILS_INVALID` | TrxID / sender number missing or malformed |
| 400 | `PAYMENT_METHOD_UNAVAILABLE` | bKash/Nagad receiving number not configured |
| 400 | `COUPON_INVALID` | Coupons not supported yet |
| 401 | – | Admin token missing or invalid |
| 404 | – | Order not found / phone does not match |
| 409 | `CART_INVALID` | Stock or availability changed; `cart` holds the refreshed cart |
| 409 | `PRICE_CHANGED` | Total changed; `cart.total` is the new amount |
| 409 | `OUT_OF_STOCK` | Last unit bought by someone else a moment ago |
| 409 | `TRXID_USED` / `TRXID_UNCHANGED` | TrxID already used / same as current |
| 409 | `CONCURRENT_UPDATE` | Order changed by another admin; refresh |
| 429 | `RATE_LIMITED` | Too many tracking/payment lookups |

---

## 6. Notes for the team

* **Sakib (frontend):** follow [checkout-payment-integration.md](checkout-payment-integration.md).
  Use `bKashNumber` in settings. Product JSON currently emits `new`/`featured` while the API PDF
  says `isNew`/`isFeatured`.
* **Sifat (backend/admin):** admin payment PATCH now supports `Refunded`; order list supports
  `paymentStatus`; dashboard has two new counters. Small fixes were made in `NotificationService`
  (atomic update) and `pom.xml` (Lombok processor). Open item: dashboard low-stock count should
  use `lowStockThreshold` (BUG-24).
* **Admin/PM:** set bKash and Nagad numbers in Store Settings before launch; change the default
  admin password and JWT secret in production.
* **Deployment:** set `FORWARD_HEADERS_STRATEGY=framework` behind a proxy. On startup the backend
  creates unique indexes on orders; if old test data has duplicate order numbers or TrxIDs a
  warning is logged; clean the duplicates and restart.
