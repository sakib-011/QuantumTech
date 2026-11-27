# QA Bug Report: Checkout, Payment & Order Flow

Reporter: Tahsan Mohammad (QA) · Review date: 23 Nov 2026 · Build: `main@10d85a7`
Fix branch: `feature/checkout-payment-qa`

Defects found while reviewing and testing the backend order, checkout and payment code.
Severity follows `TEST_PLAN.md` §6. Each fixed defect has a regression test.

## Summary

| Severity | Found | Fixed in branch | Open (reported to owner) |
|---|---|---|---|
| Critical | 3 | 3 | 0 |
| High | 6 | 6 | 0 |
| Medium | 10 | 10 | 0 |
| Low | 5 | 4 | 1 |
| Observations | 6 | – | 6 |

## Fixed defects

| ID | Sev | Defect | Steps / impact | Fix | Regression test |
|---|---|---|---|---|---|
| BUG-01 | Critical | **Client-controlled discount.** `couponDiscount` from the request body was subtracted from the total without validation. | `POST /api/orders` with `"couponDiscount": 99999` → order total 0 BDT. | Client discounts ignored; coupon codes rejected (`400 COUPON_INVALID`) until a server-side coupon module exists. | `OrderServiceTest.codOrderIsPricedServerSideAndIgnoresClientAmounts`, `rejectsCouponCodes`; `CheckoutFlowIT.codHappyPath` |
| BUG-02 | Critical | **Negative quantity on variant items.** Quantity ≥ 1 was only checked for non-variant items. | `{"productId":…,"variantId":…,"quantity":-5}` → stock *increases* by 5, negative line total lowers order total. | `CheckoutItemRequest` validates 1–10 per line for every item; merged duplicates re-checked. | `CheckoutFlowIT.validation`, `CartServiceTest.rejectsInvalidAreaAndEmptyCart` |
| BUG-03 | Critical | **Overselling.** Stock was read, decremented in Java and the whole product saved. Not atomic across instances, and overwrote concurrent admin product edits. | Two customers buy the last unit at the same moment; both succeed, stock goes negative. | `StockService`: one conditional MongoDB update per line (`stock >= qty`, `$inc`). | `CheckoutFlowIT.concurrentCheckoutsDoNotOversell` (20 buyers / 5 units → exactly 5 orders) |
| BUG-04 | High | **Partial stock deduction.** Stock for earlier lines was saved before later lines were validated; `@Transactional` was a no-op (no Mongo transaction manager). | Cart `[A×2, B×99]` → `409`, but A's stock is permanently reduced by 2. | Whole cart priced and validated first; reservations rolled back on any failure (stock race, DB error, duplicate TrxID). | `OrderServiceTest.releasesEarlierReservationsWhenALaterOneLosesTheRace`, `releasesStockWhenSavingTheOrderFails`, `CheckoutFlowIT.invalidCartRejected` |
| BUG-05 | High | **Duplicate / non-daily order numbers.** `orders.count() + 1` with a UTC date. | Numbers collide with concurrent instances or after deleting an order; sequence never resets per day; orders after 6 pm UTC (midnight BD) get the previous day's date. | Atomic per-day counter (`counters` collection) in Asia/Dhaka time + unique index + retry. | `OrderNumberGeneratorTest`, `CheckoutFlowIT.orderNumbersAreSequential`, `OrderServiceTest.retriesWithNextOrderNumberOnCollision` |
| BUG-06 | High | **Client could inject item fields.** The `OrderItem` entity was the request type, so `originalPrice`, `discountAmount` and `appliedDiscountId` from the client were persisted. | Fake "discount" data in admin and reports. | Dedicated `CheckoutItemRequest` (productId, variantId, quantity only). | `OrderServiceTest.codOrderIsPricedServerSideAndIgnoresClientAmounts` |
| BUG-07 | High | **Tracking leaked internal data.** Public `GET /api/orders/track` returned the raw `Order` document. | Anyone with order no. + phone sees `idempotencyKey`, `notificationStatus` and free-text admin notes. | `OrderPublicResponse` (customer-safe fields, `steps`, `timeline` without notes); also used for the checkout response. | `OrderPublicResponseTest`, `CheckoutFlowIT.codHappyPath` |
| BUG-08 | High | **Duplicate TrxID race.** TrxID uniqueness was a read-then-write check only. | Two orders with the same TrxID submitted together could both pass. | Sparse unique index on `trxId` + mapping of duplicate-key errors to `409 TRXID_USED`; TrxIDs stored upper-case. | `CheckoutFlowIT.duplicateTrxId`, `OrderServiceTest.duplicateTrxIdDetectedByIndexReleasesStock` |
| BUG-09 | High | **Double restock on concurrent cancellation.** Status updates had no concurrency control. | Two admins cancel the same order → stock restored twice. | Compare-and-set save on `status` + `paymentStatus` (`409 CONCURRENT_UPDATE`); stock restored only after a successful transition. | `OrderServiceTest.concurrentChangeIsRejectedAndStockNotRestoredTwice`, `CheckoutFlowIT.cancellationRestoresStock` |
| BUG-10 | Medium | Missing `phone` crashed checkout with `500` (`@Pattern` accepts null); missing `status` in payment PATCH saved `paymentStatus = null`. | Send body without these fields. | `@NotBlank` added; field size limits added to all checkout fields. | `CheckoutFlowIT.validation` |
| BUG-11 | Medium | Malformed JSON, missing query parameter, unsupported method and unknown routes returned `500`; unexpected errors were not logged. | `GET /api/orders/track?orderNumber=X` → 500. | `GlobalExceptionHandler` maps framework errors to their real 4xx status and logs real 500s. | `CheckoutFlowIT.trackingSecurity`, `CheckoutFlowIT.validation` |
| BUG-12 | Medium | COD order marked Delivered kept payment status `Pending collection`. | Deliver a COD order. | Delivered COD → `Collected`; cancelled COD → `Cancelled`. | `OrderServiceTest.codDeliveryMarksCashCollected`, `CheckoutFlowIT.codHappyPath` |
| BUG-13 | Medium | Payment verification allowed on any order state (even Delivered/Cancelled); no refund tracking when a paid order was cancelled. | Mark a cancelled order Verified; cancel a paid bKash order: money owed to the customer is not tracked. | Verify/Fail only while Pending; cancelled Verified → `Refund pending` → `Refunded`; dashboard counts. | `PaymentServiceTest`, `CheckoutFlowIT.bkashLifecycle` |
| BUG-14 | Medium | Products with variants could be ordered without `variantId`, decrementing parent stock so it no longer matched the sum of variant stocks. | Order variant product with only `productId`. | Line status `VARIANT_REQUIRED`; checkout rejected. | `CartServiceTest.variantProductsRequireAVariantAndUseVariantPriceAndStock`, `CheckoutFlowIT.cartValidation` |
| BUG-15 | Medium | Owner notification (async) re-read the order and saved the **whole document**, overwriting admin changes made at the same moment. | Verify payment right after checkout: verification can be reverted. | Notification updates only `notificationStatus` atomically. | Covered by `CheckoutFlowIT.bkashLifecycle` (immediate admin updates after checkout) |
| BUG-16 | Medium | Unauthenticated admin requests returned `403`, while the API document specifies `401`. | `GET /api/admin/orders` without token. | `HttpStatusEntryPoint(401)`. | `CheckoutFlowIT.adminEndpointsAreProtected` |
| BUG-17 | Medium | `bKashNumber` in Store Settings was serialized/accepted as `bkashNumber` (Lombok + Jackson naming), so an admin form sending `bKashNumber` was silently ignored and bKash could never be configured. | `PUT /api/admin/settings {"bKashNumber":"01…"}` → value not saved. | JSON name `bKashNumber`, `bkashNumber` still accepted. **Frontend: read `bKashNumber`.** | `StoreSettingsJsonTest` |
| BUG-18 | Medium | Payment instructions/receiving numbers were not exposed to the storefront; bKash/Nagad could be selected even when the store had no receiving number configured. | Customer pays to an unknown number. | `GET /api/payments/methods` with availability; checkout rejects unavailable methods (`PAYMENT_METHOD_UNAVAILABLE`). | `CheckoutFlowIT.walletValidation`, `paymentMethods` |
| BUG-19 | Medium | No way for a customer to correct a mistyped TrxID; a `Failed` order could only be cancelled. | Customer types wrong TrxID: lost sale. | `POST /api/orders/{orderNumber}/payment` (phone-verified, rate-limited). | `PaymentServiceTest`, `CheckoutFlowIT.bkashLifecycle` |
| BUG-20 | Low | `area` was not validated; any string was charged the outside-Dhaka rate and stored. | `"area":"abc"`. | Must be `Inside Dhaka` or `Outside Dhaka`. | `CheckoutFlowIT.validation` |
| BUG-21 | Low | Tracking rate-limit map was never cleaned up (memory grows with every IP). | Long-running server. | `LookupRateLimiter` with periodic eviction. | `LookupRateLimiterTest.evictsIdleClients` |
| BUG-22 | Low | `findByTrxIdIgnoreCase` (Optional) throws if legacy data contains duplicates → `500`. | Duplicate TrxIDs in old data. | `existsByTrxIdIgnoreCase`. | `OrderServiceTest.rejectsDuplicateTrxId` |
| BUG-23 | Low | Build failed on JDK 23+ because Lombok was not declared as an annotation processor. | `mvn compile` with JDK 23/25 → "cannot find symbol getX()". | `annotationProcessorPaths` in `pom.xml`. | Build |

## Open defects (outside checkout scope, owner to decide)

| ID | Sev | Owner | Defect | Suggested fix |
|---|---|---|---|---|
| BUG-24 | Low | Sifat | Dashboard `lowStockProducts` uses a hard-coded `5` instead of `StoreSettings.lowStockThreshold`. | Read the threshold from settings. |

## Observations / risks (for the team)

| ID | Owner | Observation |
|---|---|---|
| OBS-01 | Sifat + Sakib | Product JSON emits `"new"` and `"featured"` (Lombok boolean naming), but the API document's product contract says `isNew` and `isFeatured`. Frontend must use the actual names or the model needs `@JsonProperty`. |
| OBS-02 | Sifat | `NotificationService` retries with `Thread.sleep(60s)` on the shared async executor; during an SMTP outage each order holds a thread for about 2 minutes. Consider `@Retryable`/scheduled retry. |
| OBS-03 | Deploy | `ADMIN_PASSWORD` and `JWT_SECRET` are required environment variables; the application has no credential defaults. |
| OBS-04 | Deploy | Behind a proxy, set `FORWARD_HEADERS_STRATEGY=framework`, otherwise all customers share one tracking rate-limit bucket (the proxy IP). |
| OBS-05 | Sifat | `GET /api/admin/orders` loads every order into memory (no pagination). Fine for launch volume; add paging before the catalogue grows. |
| OBS-06 | Docs | README run instructions reference `cd backend` and `/tmp/apache-maven-3.9.9/bin/mvn`, which don't exist in this repo; the PDF's endpoint tables have shifted rows (method/endpoint/purpose misaligned). |
