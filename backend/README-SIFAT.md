# QuantumTech Spring Boot Backend

## Contributor and Backend Ownership

**Sifat (Backend & Admin Developer)** implemented and owns the following areas:

- Spring Boot backend setup and project structure
- MongoDB and MongoDB Atlas integration for the `qtechdb` database
- Admin authentication, JWT sessions, BCrypt passwords, account lockout, and password reset
- Product, product variant, stock, and category REST APIs
- Order creation, order tracking, status transitions, cancellation, and inventory restoration
- bKash and Nagad payment verification and duplicate TrxID protection
- Store settings and low-stock configuration
- Owner email notifications, retry attempts, and notification status
- Review submission, verified-purchase checks, moderation, and rating recalculation
- Cloudinary image upload integration
- API validation, error handling, security rules, Swagger documentation, and unit tests

This implementation follows the backend/admin responsibilities assigned to Sifat in the
QuantumTech sprint document.

This backend implements Sifat's assigned backend/admin work for the QuantumTech project:
MongoDB Atlas data storage, Spring Security JWT authentication, product/category/order/review
management, stock safety, payment verification, email notifications, and Cloudinary uploads.

**Tahsan Mohammad (Checkout, Payment & QA)** implemented and owns:

- Cart validation and server-side pricing (`POST /api/cart/validate`)
- Guest checkout hardening: atomic stock reservation with rollback, idempotency, price-change
  detection, daily order numbering, strict request validation
- COD, bKash and Nagad payment workflows: payment method catalogue with EN/BN instructions,
  verification rules, customer TrxID resubmission, refund tracking
- Order confirmation and customer-safe order tracking (`steps` + `timeline`)
- Integration tests on a real embedded MongoDB, QA test plan, bug report and Postman collection

Start here: **[Work summary, setup and full flows](docs/TAHSAN_WORK_SUMMARY.md)** ·
[Checkout & payment integration guide](docs/checkout-payment-integration.md) ·
[QA test plan](docs/qa/TEST_PLAN.md) · [QA bug report](docs/qa/BUG_REPORT.md) ·
[Postman collection](docs/qa/QuantumTech-Checkout.postman_collection.json)

## Stack

- Java 21
- Spring Boot 3.4
- Spring Data MongoDB
- Spring Security with JWT
- BCrypt passwords
- Cloudinary
- Spring Mail
- SpringDoc OpenAPI

## Run locally

Requires JDK 21+ and Maven 3.9+.

```bash
cp .env.example .env      # fill in values, then export them (Spring Boot does not read .env itself)
mvn spring-boot:run
```

Set the variables from `.env.example` as environment variables (terminal, IDE run
configuration or hosting dashboard). MongoDB defaults to a local database:

```properties
MONGODB_URI=mongodb://localhost:27017/qtechdb
MONGODB_DATABASE=qtechdb
```

For Atlas, set `MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER/qtechdb`.
Cloudinary values are intentionally blank until credentials are provided.

Swagger: `http://localhost:8080/swagger-ui`

## Frontend integration

Use `VITE_API_URL=http://localhost:8080` and send JSON as shown below. For every protected
admin request:

```http
Authorization: Bearer <JWT_FROM_LOGIN>
Content-Type: application/json
```

### Authentication

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/forgot-password` | Public |
| POST | `/api/auth/reset-password` | Public |

Login body:

```json
{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD","rememberMe":true}
```
Replace these placeholders with the values configured through `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

Login response:

```json
{"token":"JWT","email":"admin@quantumtech.com","name":"QuantumTech Admin","role":"Owner"}
```

### Products

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/products` | Public |
| GET | `/api/products/{idOrSlug}` | Public |
| GET | `/api/products?search=charger` | Public |
| GET | `/api/admin/products` | Admin |
| GET | `/api/admin/products/{id}` | Admin |
| POST | `/api/admin/products` | Admin |
| PUT | `/api/admin/products/{id}` | Admin |
| DELETE | `/api/admin/products/{id}` | Admin soft delete |

The JSON shape matches `frontend/src/types/index.ts#Product`.
Variants are nested under `variants`. Parent stock is recalculated from variant stocks.

### Categories

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/categories` | Public visible categories |
| GET | `/api/admin/categories` | Admin |
| POST | `/api/admin/categories` | Admin |
| PUT | `/api/admin/categories/{id}` | Admin |
| PUT | `/api/admin/categories/reorder` | Admin |
| DELETE | `/api/admin/categories/{id}` | Admin |

Deleting a category with non-deleted products returns `409 Conflict`.

### Cart, checkout, payment and tracking

Full contract, UI states and error codes: [docs/checkout-payment-integration.md](docs/checkout-payment-integration.md).

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/cart/validate` | Public: server-priced cart, stock issues, delivery charge, total |
| GET | `/api/payments/methods` | Public: COD/bKash/Nagad availability, receiving numbers, EN/BN steps |
| POST | `/api/orders` | Public guest checkout, returns the order confirmation |
| GET | `/api/orders/track?orderNumber=...&phone=...` | Public, 10 lookups / 15 min per IP |
| POST | `/api/orders/{orderNumber}/payment` | Public: customer resubmits bKash/Nagad TrxID |
| GET | `/api/admin/orders?status=&paymentMethod=&paymentStatus=&search=` | Admin |
| GET | `/api/admin/orders/{id}` | Admin |
| PATCH | `/api/admin/orders/{id}/status` | Admin |
| PATCH | `/api/admin/orders/{id}/payment` | Admin: `Verified`, `Failed`, `Refunded` |
| GET | `/api/admin/dashboard` | Admin |

Checkout body:

```json
{
  "customerName": "Rahim Uddin",
  "phone": "01712345678",
  "area": "Inside Dhaka",
  "address": "House 12, Road 5, Dhanmondi",
  "note": "Call before delivery",
  "paymentMethod": "bKash",
  "trxId": "9K8J7H6G5F",
  "senderNumber": "01712345678",
  "total": 1570,
  "source": "Facebook",
  "language": "en",
  "items": [
    {
      "productId": "PRODUCT_ID",
      "variantId": "OPTIONAL_VARIANT_ID",
      "quantity": 1
    }
  ]
}
```

Send `X-Idempotency-Key: <uuid per checkout attempt>`: repeating it returns the same order.
The backend reprices everything server-side (client `subtotal`, `deliveryCharge` and
`couponDiscount` are ignored), reserves stock atomically and rolls back on failure.
If `total` is sent and no longer matches, checkout returns `409 PRICE_CHANGED` with the fresh cart.
Coupons are not supported yet (`400 COUPON_INVALID`). Order numbers are `QT-yyMMdd-NNNN`
(Bangladesh date, daily sequence).

Status changes:

```json
{"status":"Shipped","note":"Handed to courier"}
```

Allowed: `Pending -> Confirmed -> Shipped -> Delivered` and cancellation (reason required) from
Pending, Confirmed or Shipped. Cancellation restores stock. bKash/Nagad requires
`paymentStatus=Verified` before confirmation.

Payment status lifecycle:

| Method | Lifecycle |
|---|---|
| COD | `Pending collection` → `Collected` (Delivered) or `Cancelled` (order cancelled) |
| bKash / Nagad | `Verification pending` → `Verified` or `Failed` (admin, order Pending) · `Failed` → `Verification pending` (customer resubmits) · `Verified` → `Refund pending` (order cancelled) → `Refunded` (admin) |

Payment verification:

```json
{"status":"Verified","note":"Statement matched"}
```

bKash/Nagad are offered only after the admin sets `bKashNumber` / `nagadNumber` in Store Settings.

### Reviews

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/reviews?productId=...&sortBy=newest` | Public |
| GET | `/api/reviews/stats?productId=...` | Public |
| POST | `/api/reviews` | Public |
| GET | `/api/admin/reviews` | Admin |
| PATCH | `/api/admin/reviews/{id}` | Admin |
| DELETE | `/api/admin/reviews/{id}` | Admin |

New reviews are always `Pending`. Approving/rejecting recalculates the product rating.
Customer email is stored privately and excluded from JSON responses.

### Settings and uploads

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/settings` | Public |
| PUT | `/api/admin/settings` | Admin |
| POST | `/api/admin/uploads/image` multipart `file` | Admin |

Upload response:

```json
{"url":"https://res.cloudinary.com/.../image.jpg"}
```

## Errors

Validation and business-rule failures use JSON:

```json
{"timestamp":"2026-11-22T00:00:00Z","status":400,"error":"Error message"}
```

For field validation, `fields` contains invalid field names and messages. Checkout and
payment errors also carry a machine-readable `code` (e.g. `CART_INVALID`, `PRICE_CHANGED`,
`OUT_OF_STOCK`, `TRXID_USED`, `PAYMENT_METHOD_UNAVAILABLE`, `RATE_LIMITED`) and, for cart
problems, a refreshed `cart`.

## Tests

```bash
mvn test      # unit tests (fast, no database)
mvn verify    # unit + integration tests (*IT) against an embedded MongoDB 7
```

The first `mvn verify` downloads a MongoDB binary into `~/.embedmongo` (no Docker needed).
Unit tests cover product price/variant stock rules, public filtering, reviews, cart pricing,
checkout (pricing, tampering, rollback, idempotency, numbering), order status transitions,
payment verification/resubmission/refunds, tracking and rate limiting. Integration tests
(`CheckoutFlowIT`) run the full COD and bKash flows over HTTP, including a concurrency test that
proves the last units cannot be oversold. Test case IDs: [docs/qa/TEST_PLAN.md](docs/qa/TEST_PLAN.md).
