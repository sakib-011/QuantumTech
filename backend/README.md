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

```bash
cd backend
cp .env.example .env
/tmp/apache-maven-3.9.9/bin/mvn spring-boot:run
```

Set environment variables in `.env` or your terminal. `MONGODB_URI` is required and should be
the MongoDB Atlas SRV connection string for deployment. `.env.example` contains a placeholder;
replace it with your Atlas URI locally, and keep real credentials out of Git:

```properties
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/qtechdb
MONGODB_DATABASE=qtechdb
```
Generate a unique JWT signing secret of at least 32 bytes (for example, with
`openssl rand -base64 48`) and set it as `JWT_SECRET` in `.env`. Do not use the example
placeholder or commit the generated secret. Spring Boot loads this ignored `.env` file when
started from the `backend` directory.
Cloudinary values are intentionally blank until credentials are provided.
Set `CORS_ALLOWED_ORIGINS` to the actual frontend origin(s) when deploying outside Vercel.

Swagger: `http://localhost:8080/swagger-ui`

## Frontend integration

Use `VITE_API_URL=http://localhost:8080` and send JSON as shown below. For every protected
admin request:

```http
Authorization: Bearer <JWT_FROM_LOGIN>
Content-Type: application/json
```

The frontend calls these REST endpoints for catalog, customer/admin accounts, settings, images,
checkout, orders, reviews, and promotions. Product/category/promotion/settings/admin-profile writes
are confirmed by the backend before the browser cache is updated. Guest carts and display
preferences (language/theme) remain browser-local; checkout requires a successful server-side cart
validation and order creation. Payment confirmation remains manual through the admin workflow.
When the backend is unavailable, business writes and checkout fail with a visible error instead
of being reported as successfully saved locally.

### Authentication

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| PUT | `/api/admin/profile` | Administrator JWT |
| POST | `/api/auth/forgot-password` | Public |
| POST | `/api/auth/reset-password` | Public |
| POST | `/api/auth/customer/register` | Public |
| POST | `/api/auth/customer/login` | Public |
| POST | `/api/auth/customer/forgot-password` | Public |
| POST | `/api/auth/customer/verify-reset-otp` | Public |
| POST | `/api/auth/customer/reset-password` | Public |
| PUT | `/api/customer/me` | Customer — delivery details |
| PUT | `/api/customer/me/personal` | Customer — name, email and phone |

Login body:

```json
{"email":"admin@quantumtech.com","password":"admin123","rememberMe":true}
```

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

The JSON shape matches `frontendV2/src/types/index.ts#Product`, including `isFeatured` and
`isNew`.
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

### Orders

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/orders` | Public |
| GET | `/api/orders/track?orderNumber=...&phone=...` | Public |
| POST | `/api/cart/validate` | Public |
| GET | `/api/payments/methods` | Public |
| POST | `/api/orders/{orderNumber}/payment` | Public, phone verified |
| GET | `/api/admin/orders` | Admin |
| GET | `/api/admin/orders/{id}` | Admin |
| PATCH | `/api/admin/orders/{id}/status` | Admin |
| PATCH | `/api/admin/orders/{id}/payment` | Admin |
| GET | `/api/admin/dashboard` | Admin |

Checkout body:

```json
{
  "customerName": "Rahim Uddin",
  "phone": "01712345678",
  "area": "Inside Dhaka",
  "address": "House 12, Road 5, Dhanmondi",
  "note": "Call before delivery",
  "deliveryCharge": 70,
  "paymentMethod": "bKash",
  "trxId": "9K8J7H6G5F",
  "senderNumber": "01712345678",
  "couponCode": null,
  "couponDiscount": 0,
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

Send `X-Idempotency-Key: UNIQUE_VALUE` on checkout to protect repeated submissions.
The backend rechecks product availability, stock, price, delivery charge, and TrxID uniqueness.

Status changes:

```json
{"status":"Shipped","note":"Handed to courier"}
```

Allowed: `Pending -> Confirmed -> Shipped -> Delivered` and cancellation from Pending,
Confirmed or Shipped. bKash/Nagad requires `paymentStatus=Verified` before confirmation.

Payment verification:

```json
{"status":"Verified","note":"Statement matched"}
```

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

Settings also persist the bilingual hero customization fields used by `frontendV2`, including
`heroBadgeText`, `heroTitleLine1`, `heroSubtitle`, `heroBannerImage`, both CTA text/link pairs,
and the rating label/text fields.

### Campaigns, promotions, coupons, and analytics

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/campaigns` | Public active campaigns |
| GET | `/api/campaigns/slug/{slug}` | Public campaign landing page |
| GET/POST | `/api/admin/campaigns` | Admin list/create |
| PUT/DELETE | `/api/admin/campaigns/{id}` | Admin update/delete |
| GET | `/api/promotions/popups/active` | Public active popups |
| GET/POST | `/api/admin/popups` | Admin list/create |
| PUT/DELETE | `/api/admin/popups/{id}` | Admin update/delete |
| GET | `/api/discounts/active` | Public active product discounts |
| GET/POST | `/api/admin/discounts` | Admin list/create |
| PUT/DELETE | `/api/admin/discounts/{id}` | Admin update/delete |
| GET/POST | `/api/admin/coupons` | Admin list/create |
| PUT/DELETE | `/api/admin/coupons/{id}` | Admin update/delete |
| POST | `/api/promotions/coupons/validate` | Public |
| POST | `/api/campaign-analytics/events` | Public event tracking |
| GET | `/api/admin/campaign-analytics/summary` | Admin |
| GET/DELETE | `/api/admin/campaign-analytics/events` | Admin |

Promotion payloads use the matching interfaces in `frontendV2/src/types/promotions.ts`.
Checkout recalculates product discounts and coupon eligibility from stored product, discount,
and coupon data; client-provided item prices and coupon discount amounts are not trusted.

## Errors

Validation and business-rule failures use JSON:

```json
{"timestamp":"2026-11-22T00:00:00Z","status":400,"error":"Error message"}
```

For field validation, `fields` contains invalid field names and messages.

## Tests

```bash
mvn test
```

`mvn verify` also runs checkout, payment, stock, and order-tracking smoke tests against an
embedded MongoDB instance.
