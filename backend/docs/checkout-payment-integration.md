# Checkout, Payment & Order Tracking — Frontend Integration Guide

Owner: **Tahsan Mohammad** (Checkout, Payment & QA) · Consumers: storefront (Sakib), admin dashboard (Sifat)

This guide describes how the storefront should implement the cart, guest checkout,
COD / bKash / Nagad payment, order confirmation and order tracking against the backend.
All amounts are whole **BDT** integers. Base URL: `VITE_API_URL` (local `http://localhost:8080`).

---

## 1. End-to-end flow

```
Product page ──add──▶ Cart (localStorage)
                         │  POST /api/cart/validate   (on open, on change, before checkout)
                         ▼
                    Checkout form ── GET /api/payments/methods
                         │  POST /api/orders  (+ X-Idempotency-Key)
                         ▼
               Order confirmation page (response of POST /api/orders)
                         │
                         ▼
               Track order page ── GET /api/orders/track?orderNumber=&phone=
                         │  (bKash/Nagad Failed) POST /api/orders/{orderNumber}/payment
                         ▼
Admin: verify payment ─▶ Confirm ─▶ Ship ─▶ Deliver      (or Cancel with reason)
```

## 2. Cart

The cart lives in the browser. Store **only identifiers and quantities**; everything else
(name, price, image, stock) comes from the server so it can never be stale or tampered with.

```ts
// localStorage key: "qt_cart"
type CartItem = { productId: string; variantId?: string | null; quantity: number };
```

Rules enforced by the server:

| Rule | Value |
|---|---|
| Quantity per line | 1 – 10 (duplicate lines for the same product/variant are merged, merged total ≤ 10) |
| Lines per cart | ≤ 50 |
| Product with variants | `variantId` is required (`VARIANT_REQUIRED` otherwise) |

### `POST /api/cart/validate` (public)

Call when the cart drawer/page opens, after each change (debounced), when the delivery area
changes, and right before submitting checkout.

```json
{ "area": "Inside Dhaka", "items": [ { "productId": "p1", "variantId": null, "quantity": 2 } ] }
```

`area` is optional (`Inside Dhaka` | `Outside Dhaka`). Without it `deliveryCharge` is `null`.

Response `200`:

```json
{
  "valid": false,
  "area": "Inside Dhaka",
  "items": [
    { "productId": "p1", "variantId": null, "productName": "65W Charger", "productNameBn": "…",
      "slug": "65w-charger", "variantName": null, "image": "https://…", "unitPrice": 1500,
      "originalPrice": 1800, "quantity": 2, "availableStock": 10, "lineTotal": 3000,
      "status": "OK", "message": null },
    { "productId": "p2", "variantId": "v-2m", "productName": "USB-C Cable", "variantName": "2m",
      "unitPrice": 450, "quantity": 3, "availableStock": 1, "lineTotal": 1350,
      "status": "INSUFFICIENT_STOCK", "message": "USB-C Cable (2m): only 1 left in stock" }
  ],
  "itemCount": 2, "subtotal": 3000, "deliveryCharge": 70, "total": 3070,
  "issues": ["USB-C Cable (2m): only 1 left in stock"]
}
```

| Line `status` | UI behaviour |
|---|---|
| `OK` | normal |
| `INSUFFICIENT_STOCK` | show message, offer "set quantity to `availableStock`" |
| `OUT_OF_STOCK` | show "Out of stock", offer remove |
| `UNAVAILABLE` | product hidden/deleted/variant removed: show message, offer remove |
| `VARIANT_REQUIRED` | link back to product page to choose an option |

`subtotal`, `itemCount` and `total` include **only `OK` lines**. Disable "Place order" while `valid` is `false`.

## 3. Payment methods

### `GET /api/payments/methods` (public)

```json
[
  { "code": "COD", "name": "Cash on Delivery", "nameBn": "ক্যাশ অন ডেলিভারি", "available": true,
    "requiresTrxId": false, "merchantNumber": null, "instructions": ["…"], "instructionsBn": ["…"] },
  { "code": "bKash", "name": "bKash", "nameBn": "বিকাশ", "available": true, "requiresTrxId": true,
    "merchantNumber": "01811111111", "instructions": ["Open the bKash app or dial *247#.", "…"],
    "instructionsBn": ["…"] },
  { "code": "Nagad", "…": "…" }
]
```

* Hide or disable methods with `available: false`. bKash/Nagad become available once the admin
  sets **bKash number / Nagad number** in Store Settings.
* For `requiresTrxId: true` show the merchant number with a copy button, the order **total**
  to send, the step list (`instructions` / `instructionsBn` by language), and two inputs:
  **TrxID** (8–12 letters/digits) and **sender number** (the wallet number paid from).

## 4. Checkout

### `POST /api/orders` (public) → `201` order confirmation

Headers:

```http
Content-Type: application/json
X-Idempotency-Key: <uuid generated once per checkout attempt>
```

Generate the key with `crypto.randomUUID()` **when the checkout page loads** and reuse it for
retries/double-clicks of the same attempt. The same key always returns the same order (no
duplicate order, no double stock deduction). Generate a new key after a successful order.

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
  "total": 3070,
  "source": "Facebook",
  "language": "en",
  "items": [ { "productId": "p1", "variantId": null, "quantity": 2 } ]
}
```

| Field | Rules |
|---|---|
| `customerName` | required, 2–80 chars |
| `phone` | required, `01[3-9]XXXXXXXX` (`+88`/`88` prefix, spaces and dashes accepted, stored as 11 digits) |
| `area` | `Inside Dhaka` \| `Outside Dhaka` |
| `address` | required, 5–300 chars |
| `note` | optional, ≤ 500 |
| `paymentMethod` | `COD` \| `bKash` \| `Nagad` |
| `trxId`, `senderNumber` | required for bKash/Nagad; TrxID 8–12 alphanumeric, stored upper-case, must be unique |
| `total` | **recommended**: the total the customer saw. If it no longer matches, `409 PRICE_CHANGED` |
| `couponCode` | coupons are not supported yet; any non-empty value returns `400 COUPON_INVALID` |
| `subtotal`, `deliveryCharge`, `couponDiscount` | ignored, the server always recalculates |
| `language` | `en` \| `bn` |

The server re-prices the cart, reserves stock atomically (no overselling) and creates the
order with number `QT-yyMMdd-NNNN` (Bangladesh date, daily sequence).

Response `201` (`OrderPublicResponse`), which is also the tracking response:

```json
{
  "id": "…", "orderNumber": "QT-261123-0007", "customerName": "Rahim Uddin", "phone": "01712345678",
  "area": "Inside Dhaka", "address": "…", "note": "…",
  "items": [ { "productId": "p1", "variantId": null, "productName": "65W Charger", "variantName": null,
               "image": "https://…", "unitPrice": 1500, "quantity": 2, "lineTotal": 3000 } ],
  "subtotal": 3000, "couponDiscount": null, "deliveryCharge": 70, "total": 3070,
  "paymentMethod": "bKash", "paymentStatus": "Verification pending",
  "trxId": "9K8J7H6G5F", "senderNumber": "01712345678", "paymentActionRequired": false,
  "status": "Pending", "cancellationReason": null,
  "steps": [ { "status": "Pending", "completed": true, "current": true, "at": "2026-11-23T08:00:00Z" },
             { "status": "Confirmed", "completed": false, "current": false, "at": null },
             { "status": "Shipped", "completed": false, "current": false, "at": null },
             { "status": "Delivered", "completed": false, "current": false, "at": null } ],
  "timeline": [ { "status": "Pending", "at": "2026-11-23T08:00:00Z" } ],
  "createdAt": "…", "updatedAt": "…"
}
```

After `201`: clear the cart, save `{orderNumber, phone}` in `sessionStorage` (so a refresh of the
confirmation page can re-fetch via tracking), and navigate to `/order-confirmation/{orderNumber}`.

### Checkout errors

All errors are JSON `{ "timestamp", "status", "error", ["code"], ["fields"], ["cart"] }`.

| HTTP | `code` | Meaning → UI action |
|---|---|---|
| 400 | – (`fields` present) | field validation → show messages under inputs (`fields.phone`, `fields["items[0].quantity"]`, …) |
| 400 | `PAYMENT_DETAILS_INVALID` | TrxID / sender number missing or malformed |
| 400 | `PAYMENT_METHOD_UNAVAILABLE` | method switched off → reload payment methods |
| 400 | `COUPON_INVALID` | remove coupon |
| 409 | `CART_INVALID` | stock/availability changed → replace cart view with `cart` (a `CartQuote`) |
| 409 | `PRICE_CHANGED` | show new `cart.total`, ask the customer to confirm, resubmit with new `total` |
| 409 | `OUT_OF_STOCK` | someone bought the last unit a moment ago → re-validate cart |
| 409 | `TRXID_USED` | "This TrxID has already been used", re-enter TrxID |
| 429 | `RATE_LIMITED` | tracking/payment lookups only: wait 15 minutes |
| 500 | – | generic "Something went wrong, please try again" (retry with the **same** idempotency key) |

## 5. Order confirmation page

Show order number (large, copyable), items, totals, delivery area, payment method and:

* **COD**: "Pay {total} BDT in cash on delivery. We'll call {phone} to confirm."
* **bKash/Nagad** (`Verification pending`): "We received your TrxID {trxId}. Your order will be
  confirmed after we verify the payment."
* A **Track order** link prefilled with order number + phone.

## 6. Order tracking

### `GET /api/orders/track?orderNumber=QT-261123-0007&phone=01712345678` (public)

Returns the same `OrderPublicResponse`. Order number is case-insensitive; the phone must be the
one used at checkout (any common format). Wrong phone and unknown order both return `404`
with the same message (no information leak). Max **10 lookups per 15 minutes per IP** (`429`).

Rendering:

* Progress bar from `steps` (`completed`, `current`, `at`). For `status: "Cancelled"`, show the
  reached steps plus a red "Cancelled — {cancellationReason}" banner.
* History list from `timeline` (customer-safe; admin notes are never included).
* Payment badge from `paymentStatus`:

| paymentMethod | paymentStatus | Badge |
|---|---|---|
| COD | Pending collection | "Pay on delivery" |
| COD | Collected | "Paid" |
| COD | Cancelled | – |
| bKash/Nagad | Verification pending | "Verifying payment" |
| bKash/Nagad | Verified | "Paid" |
| bKash/Nagad | Failed | "Payment not found", show resubmit form (`paymentActionRequired: true`) |
| bKash/Nagad | Refund pending / Refunded | "Refund in progress" / "Refunded" |

### `POST /api/orders/{orderNumber}/payment` (public): resubmit TrxID

Allowed while the order is `Pending` and payment is `Verification pending` or `Failed`.

```json
{ "phone": "01712345678", "trxId": "AB12CD34EF", "senderNumber": "01898765432" }
```

Returns the updated `OrderPublicResponse` (`paymentStatus` back to `Verification pending`).
Errors: `404` (wrong phone/order), `409 TRXID_USED`, `409 TRXID_UNCHANGED`, `409` (already
verified/confirmed), `400` (COD order), `429`.

## 7. Admin dashboard (Sifat)

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/orders?status=&paymentMethod=&paymentStatus=&search=` | `paymentStatus=Verification pending` gives the verification queue; `search` matches order number, phone, name or TrxID |
| PATCH | `/api/admin/orders/{id}/payment` | `{"status":"Verified"\|"Failed"\|"Refunded","note":"…"}` |
| PATCH | `/api/admin/orders/{id}/status` | `{"status":"Confirmed"\|"Shipped"\|"Delivered"\|"Cancelled","note":"…","reason":"…"}` |
| GET | `/api/admin/dashboard` | now also returns `paymentVerificationPending` and `refundPending` counts |

Payment rules:

* `Verified` / `Failed` only while the order is `Pending`; repeating the same decision → `409`.
* bKash/Nagad orders can be `Confirmed` only after `Verified`.
* Cancelling a `Verified` order sets `Refund pending`; mark `Refunded` after sending the money back.
* COD: `Delivered` sets `Collected`; `Cancelled` sets payment `Cancelled`.
* Cancelling restores stock (exactly once). `Delivered` and `Cancelled` are final.
* If two admins change the same order at once, the second gets `409 CONCURRENT_UPDATE` → refresh.

## 8. Deployment notes

* Behind Render/Railway/Nginx set `FORWARD_HEADERS_STRATEGY=framework` so tracking rate limits
  apply per customer IP rather than per proxy.
* Set **bKash number** and **Nagad number** in Store Settings before enabling those methods.
* On startup the backend creates unique indexes on `orders.orderNumber`, `orders.trxId` and
  `orders.idempotencyKey`. If old test data contains duplicates, a warning is logged; clean
  the duplicates and restart.
