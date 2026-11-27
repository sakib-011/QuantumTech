# QuantumTech — Checkout, Payment & Integration Test Plan

| | |
|---|---|
| Owner | Tahsan Mohammad (Checkout, Payment & QA) |
| Project | QuantumTech E-Commerce Website, Team Beryllium |
| Window | 21 Nov – 3 Dec 2026 |
| References | SRS, Project Charter, `QuantumTech_API_Documentation.pdf`, `docs/checkout-payment-integration.md` |

## 1. Scope

In scope:

* Cart validation and pricing, guest checkout, order creation
* Payment workflows: Cash on Delivery, bKash and Nagad (manual TrxID verification), refunds
* Order confirmation and public order tracking
* Admin order lifecycle (status transitions, payment verification, cancellation and restock)
* Frontend ↔ backend integration of the above, plus cross-cutting checks (validation, security, concurrency)

Out of scope here (covered by the owning developer's unit tests): product/category CRUD,
reviews, image upload, admin login lockout and password reset.

## 2. Test levels and how to run them

| Level | Tooling | Location | Command |
|---|---|---|---|
| Unit | JUnit 5 + Mockito | `src/test/java/**/*Test.java` | `mvn test` |
| API integration | Spring Boot Test + MockMvc + embedded MongoDB 7 (real `mongod`, no Docker) | `src/test/java/**/integration/*IT.java` | `mvn verify` |
| Manual API | Postman collection | `docs/qa/QuantumTech-Checkout.postman_collection.json` | import, set `baseUrl` |
| End-to-end UI | Manual, browser (Chrome desktop + Android Chrome 360px) | section 5 below | against staging |

The first `mvn verify` downloads MongoDB (≈ 300–500 MB) into `~/.embedmongo`; later runs are offline.

## 3. Entry and exit criteria

Entry: backend builds; `mvn test` green; staging has seeded products (with and without variants)
and bKash/Nagad numbers set in Store Settings.

Exit (release gate for 3 Dec):

* 100% of automated tests pass (`mvn verify`).
* All P1/P2 manual cases pass on desktop and mobile.
* No open **Critical** or **High** defects in checkout/payment; Medium defects have an owner and a decision.

## 4. Automated test cases

IDs match the `@DisplayName` of the integration tests in `CheckoutFlowIT`; unit-level cases are
listed with their test class.

### Cart

| ID | Case | Expected | Automated in |
|---|---|---|---|
| TC-CART-01 | Validate cart with valid items | Server prices, subtotal, delivery and total | `CheckoutFlowIT.cartValidation`, `CartServiceTest` |
| TC-CART-02 | Quantity above stock | `INSUFFICIENT_STOCK` with `availableStock` | same |
| TC-CART-03 | Hidden/deleted/missing product, missing variant choice | `UNAVAILABLE` / `VARIANT_REQUIRED`, excluded from subtotal | same |
| TC-CART-04 | Quantity 0 or > 10, empty cart, invalid area | `400` | `CheckoutFlowIT.cartValidationLimits`, `CartServiceTest` |
| TC-CART-05 | Duplicate lines for same product | Merged before stock check | `CartServiceTest.mergesDuplicateLinesBeforeCheckingStock` |
| TC-CART-06 | Delivery charge Inside/Outside Dhaka from settings | 70 / 130 by default, settings override | `CartServiceTest` |

### Cash on Delivery

| ID | Case | Expected | Automated in |
|---|---|---|---|
| TC-COD-01 | Place COD order | `201`, `QT-yyMMdd-NNNN`, status Pending, payment `Pending collection` | `CheckoutFlowIT.codHappyPath` |
| TC-COD-02 | Tampered `deliveryCharge` / `couponDiscount` in request | Ignored; server totals used | same, `OrderServiceTest` |
| TC-COD-03 | Stock decremented on order | Stock reduced by quantity | same |
| TC-COD-04 | Confirm, then Ship, then Deliver | Each allowed; Delivered sets payment `Collected` | same |
| TC-COD-05 | Change a Delivered order | `409` | same |
| TC-COD-06 | Cancel without reason / with reason / twice | `400` / `200` + restock / `409`, stock restored once | `CheckoutFlowIT.cancellationRestoresStock` |
| TC-COD-07 | Skip a step (Pending to Delivered) | `400` | `OrderServiceTest.rejectsSkippingSteps` |

### Stock and integrity

| ID | Case | Expected | Automated in |
|---|---|---|---|
| TC-STK-01 | Order a variant | Variant stock and parent stock both decremented | `CheckoutFlowIT.variantStock` |
| TC-STK-02 | Cancel variant order | Both restored | same |
| TC-STK-03 | Checkout with an invalid line | `409 CART_INVALID` + refreshed `cart`; nothing reserved | `CheckoutFlowIT.invalidCartRejected` |
| TC-STK-04 | 20 concurrent buyers, 5 units | Exactly 5 orders, stock 0, unique numbers | `CheckoutFlowIT.concurrentCheckoutsDoNotOversell` |
| TC-STK-05 | Same `X-Idempotency-Key` twice | Same order returned, stock reduced once | `CheckoutFlowIT.idempotentCheckout` |
| TC-STK-06 | Client `total` differs from server | `409 PRICE_CHANGED` with new total | `CheckoutFlowIT.priceChanged` |
| TC-STK-07 | Later line loses stock race | Earlier reservations released | `OrderServiceTest.releasesEarlierReservationsWhenALaterOneLosesTheRace` |
| TC-STK-08 | DB failure while saving order | Reservations released | `OrderServiceTest.releasesStockWhenSavingTheOrderFails` |
| TC-ORD-01 | Order numbering | Daily sequence `-0001`, `-0002` in Bangladesh time | `CheckoutFlowIT.orderNumbersAreSequential`, `OrderNumberGeneratorTest` |
| TC-ORD-02 | Order number collision | Retries with next number | `OrderServiceTest.retriesWithNextOrderNumberOnCollision` |
| TC-ORD-03 | Two admins update the same order | Second gets `409 CONCURRENT_UPDATE`, no double restock | `OrderServiceTest.concurrentChangeIsRejectedAndStockNotRestoredTwice` |

### bKash / Nagad

| ID | Case | Expected | Automated in |
|---|---|---|---|
| TC-PAY-01 | Place bKash order with TrxID | `201`, payment `Verification pending`, TrxID upper-cased | `CheckoutFlowIT.bkashLifecycle` |
| TC-PAY-02 | Confirm before verification | `409` | same |
| TC-PAY-03 | Admin marks Failed | Tracking shows `paymentActionRequired: true` | same |
| TC-PAY-04 | Customer resubmits new TrxID | Back to `Verification pending` | same |
| TC-PAY-05 | Admin verifies, then confirms | `200` | same |
| TC-PAY-06 | Change payment after confirmation | `409` | same |
| TC-PAY-07 | Cancel verified order, then refund | `Refund pending`, then `Refunded`; dashboard counts | same |
| TC-PAY-08 | Reuse TrxID (any case) at checkout or resubmission | `409 TRXID_USED`, no stock held | `CheckoutFlowIT.duplicateTrxId` |
| TC-PAY-09 | Missing TrxID; wallet without store number | `400`; `400 PAYMENT_METHOD_UNAVAILABLE` | `CheckoutFlowIT.walletValidation` |
| TC-PAY-10 | Payment method list | COD/bKash/Nagad with numbers and EN/BN steps | `CheckoutFlowIT.paymentMethods` |
| TC-PAY-11 | Resubmit with wrong phone / same TrxID / after verification / COD | `404` / `409` / `409` / `400` | `PaymentServiceTest` |
| TC-PAY-12 | Verify a COD order; refund a non-cancelled order | `400`; `409` | `PaymentServiceTest` |

### Tracking, validation, security

| ID | Case | Expected | Automated in |
|---|---|---|---|
| TC-TRK-01 | Track with matching phone (any format, any case order no.) | `200` public view | `CheckoutFlowIT.codHappyPath`, `OrderServiceTest.Tracking` |
| TC-TRK-02 | Wrong phone vs unknown order | Both `404`, identical message | `CheckoutFlowIT.trackingSecurity` |
| TC-TRK-03 | Missing `phone` parameter | `400` (was `500`) | same |
| TC-TRK-04 | More than 10 lookups / 15 min from one IP | `429 RATE_LIMITED` | `OrderServiceTest.Tracking`, `LookupRateLimiterTest` |
| TC-TRK-05 | Public response hides internal data | No idempotency key, notification status or admin notes | `OrderPublicResponseTest` |
| TC-VAL-01 | Invalid phone / area | `400` + `fields` | `CheckoutFlowIT.validation` |
| TC-VAL-02 | Missing phone | `400` (was `500`) | same |
| TC-VAL-03 | Malformed JSON | `400` (was `500`) | same |
| TC-VAL-04 | Coupon code sent | `400 COUPON_INVALID` | same |
| TC-SEC-01 | Admin endpoints without / with forged token | `401` | `CheckoutFlowIT.adminEndpointsAreProtected` |
| TC-SEC-02 | Client-supplied prices, discounts, item names | Never persisted | `OrderServiceTest.codOrderIsPricedServerSideAndIgnoresClientAmounts` |

## 5. Manual end-to-end UI cases (storefront + admin)

Priority: P1 = release blocker, P2 = must fix before launch if found, P3 = nice to have.

| ID | P | Steps | Expected |
|---|---|---|---|
| E2E-01 | P1 | Add 2 products (one with variant) to cart, reload page | Cart persists; prices from server |
| E2E-02 | P1 | Change quantity to above stock in cart | Inline "only N left", Place order disabled |
| E2E-03 | P1 | Checkout COD, Inside Dhaka | Confirmation page with order number, total = subtotal + 70 |
| E2E-04 | P1 | Switch area to Outside Dhaka on checkout | Delivery updates to 130 before submit |
| E2E-05 | P1 | Checkout bKash: merchant number shown, copy button, TrxID + sender required | Order placed, "Verifying payment" |
| E2E-06 | P1 | Double-click "Place order" / refresh during submit | Exactly one order created |
| E2E-07 | P1 | Admin: verify bKash payment, then confirm, ship, deliver | Each step visible on customer tracking page |
| E2E-08 | P1 | Admin: mark payment Failed; customer resubmits TrxID on tracking page | Payment back to verifying; admin sees new TrxID |
| E2E-09 | P1 | Track with wrong phone | "No order found…" |
| E2E-10 | P2 | Admin cancels verified order, then marks Refunded | Customer sees cancelled + refund status; stock restored |
| E2E-11 | P2 | Admin hides a product that is in a customer's cart | Cart shows "no longer available", checkout blocked |
| E2E-12 | P2 | Two browsers buy the last unit at the same time | One succeeds, other sees out-of-stock message |
| E2E-13 | P2 | Bangla language checkout | Payment instructions in Bangla; order `language = bn` |
| E2E-14 | P2 | Mobile 360px: cart, checkout, confirmation, tracking | No horizontal scroll, inputs usable, numeric keypad on phone/TrxID |
| E2E-15 | P2 | Owner email arrives for new order | Subject contains order number; dashboard shows notification status |
| E2E-16 | P3 | Network offline during checkout, retry | Same order (idempotency), no duplicate |

## 6. Defect management

Severity:

* **Critical**: money or stock loss, security breach, checkout impossible.
* **High**: wrong totals or statuses, data exposure, major flow broken with a workaround.
* **Medium**: incorrect behaviour in edge cases, wrong error codes, UX blockers on one device.
* **Low**: cosmetic, copy, minor inconsistencies.

Defects are logged in `docs/qa/BUG_REPORT.md` (ID, severity, steps, expected/actual, owner,
status) and raised in the team channel. Critical/High go to Sakib (technical lead) the same day.

## 7. Daily QA report template

```
QA update — <date> — Tahsan
Automated: <n> unit + <n> integration tests, <pass>/<total> passing
Manual: <ids executed>, <passed>, <failed>
New defects: <ids + severity + owner>
Fixed/verified: <ids>
Blockers: <none | description + who is needed>
Next: <plan>
```
