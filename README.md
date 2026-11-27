# QuantumTech — Premium Tech Accessories E-Commerce Platform

QuantumTech is a modern, high-performance, responsive e-commerce web application designed for premium consumer electronics, chargers, audio gear, and lifestyle gadgets in Bangladesh. The platform features an end-to-end guest checkout workflow, a bilingual English/Bangla localization system, dynamic promotional campaigns and popup marketing, an order verification and review moderation engine, and an enterprise-grade Admin Dashboard equipped with real-time product variant stock synchronization.

---

## Table of Contents

- [Key Features](#key-features)
  - [Customer Storefront](#customer-storefront)
  - [Product Showcase & Variant System](#product-showcase--variant-system)
  - [Bilingual Localization (EN / BN)](#bilingual-localization-en--bn)
  - [Guest Checkout & Payment Gateway](#guest-checkout--payment-gateway)
  - [Order Tracking & Lifecycle Management](#order-tracking--lifecycle-management)
  - [Customer Review & Rating System](#customer-review--rating-system)
  - [Promotional Campaigns & Marketing Suite](#promotional-campaigns--marketing-suite)
  - [Enterprise Admin Dashboard](#enterprise-admin-dashboard)
- [Automatic Stock Synchronization Engine](#automatic-stock-synchronization-engine)
- [Technology Stack](#technology-stack)
- [Project Architecture & Directory Structure](#project-architecture--directory-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Server](#development-server)
  - [Production Build](#production-build)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Design System & UI Guidelines](#design-system--ui-guidelines)
- [Default Admin Credentials](#default-admin-credentials)
- [License](#license)

---

## Key Features

### Customer Storefront
- **High-Impact Hero & Landing Page**: Hero banner showcasing top gadgets, featured categories, trust badges (Quality Guaranteed, 7-Day Replacement, Fast Delivery across BD), and customer guarantees.
- **Search & Discovery**: Real-time keyword search indexing product titles, Bengali names, categories, tags, and detailed descriptions with zero delay.
- **Category Browsing & Filtering**: Clean category filters, price sorting, availability toggles, and dynamic promotional discount badges.
- **100% Mobile Responsive**: Tested from 360px mobile viewports up to 1920px ultrawide displays with zero horizontal scrolling.

### Product Showcase & Variant System
- **Multi-Image Gallery**: Up to 6 high-resolution product images with thumbnail navigation and swipeable mobile touch gesture support.
- **Dynamic Pricing & Countdown Timers**: Displays active prices, previous strike-through prices, promotional percentage discounts, calculated savings, and real-time flash deal countdown clocks.
- **Variants Support**: Color, model, and size variant selectors with individual variant stock allocation.
- **Storefront Availability Protection**: Add to Cart button automatically disables if a selected variant is out of stock.
- **Direct Engagement Actions**: Integrated WhatsApp inquiry, Messenger chat, Facebook sharing, and quick link copy.

### Bilingual Localization (EN / BN)
- **Centralized Translation Architecture**: Native English (`Inter`) and Bengali (`Hind Siliguri`) typography switching.
- **Full Application Coverage**: Storefront, navigation, catalog, product details, cart, checkout, tracking, legal policies, reviews, and admin dashboard.
- **Persistent Preferences**: Language selection is saved in `localStorage` (`qt_language`) and preserved across browser sessions.

### Guest Checkout & Payment Gateway
- **Frictionless Guest Purchasing**: No mandatory account creation; customers can complete checkout in under 60 seconds.
- **Delivery Zone Calculation**:
  - Inside Dhaka: ৳70
  - Outside Dhaka: ৳130
- **Supported Payment Methods**:
  - **Cash on Delivery (COD)**: Payment collected upon delivery.
  - **bKash & Nagad**: Manual mobile money workflows with customer Sender Number and Transaction ID (TrxID) verification inputs.
- **Promo Code & Coupon Validation**: Real-time voucher code verification with minimum order value checks and discount deductions.

### Order Tracking & Lifecycle Management
- **Order Number Format**: Standardized `QT-YYMMDD-XXXX` identifier.
- **4-Stage Live Progress Bar**: Pending → Confirmed → Shipped → Delivered.
- **Cancellation Transparency**: Clear cancellation tags, cancellation date, and recorded administrative reasons with automatic stock restoration.
- **Self-Service Tracking**: Lookup orders by order number and customer mobile number at `/track-order`.

### Customer Review & Rating System
- **Verified Purchase Engine**: Validates order numbers against past orders to reward verified customer reviews.
- **Rich Media Reviews**: Star rating selection (1–5 stars), review titles, detailed feedback, and customer photo attachments.
- **Customer Privacy Protection**: Customer email addresses are collected privately and strictly excluded from public storefront DOM elements.
- **Admin Moderation Workflow**: Submitted reviews remain in a pending moderation queue until approved by an administrator.

### Promotional Campaigns & Marketing Suite
- **Dynamic Popup Advertisements**: Timed overlay announcements with customizable impression delays, frequency caps (e.g. once per session), and strict suppression on checkout routes.
- **Festival & Seasonal Campaigns**: Dedicated campaign landing pages (`/campaign/:slug`) with outcome-driven hero banners, voucher code strips, and live countdown timers.
- **Product Discount Rules**: Automated discount rules (percentage or fixed BDT) with priority-based conflict resolution.
- **Voucher Coupons**: Coupon code management with usage limits, expiry scheduling, and minimum purchase thresholds.
- **Marketing Analytics**: Real-time tracking of popup impressions, clicks, click-through rates (CTR), orders, and generated revenue.

### Enterprise Admin Dashboard
- **KPI Metrics**: Real-time counts for Total Products, Total Orders, Pending Orders, Delivered Orders, and Low Stock watchlists.
- **Product Management**: Full CRUD capabilities, multi-image manager, category assignment, specifications builder, and variant stock management.
- **Order Management**: Search by order ID or phone number, status filters, payment verification guards (bKash/Nagad TrxID verification required before order confirmation), and aging indicators for pending orders (>24 hours).
- **Review Moderation**: Approve, reject, or delete incoming customer reviews with private email inspection.
- **Store Settings**: Configurable delivery charges, store contact details, support hotlines, and operational settings.

---

## Automatic Stock Synchronization Engine

QuantumTech implements a robust stock calculation model across the entire application stack:

1. **Formula**: For products with variants, the parent product's stock is calculated automatically as the sum of all its variants:
   $$\text{Total Main Stock} = \sum_{v \in \text{Variants}} \max(0, \text{Stock}_v)$$
2. **Admin UI Lock**: In `AdminProductFormPage.tsx`, the main product stock field is disabled and marked read-only with a locked badge `Total Stock (Automatically calculated from variants)`. When all variants are deleted, it automatically reverts to an editable manual stock field.
3. **Reactive Updates**: Modifying a variant's stock, adding a variant, or deleting a variant immediately recalculates and updates the total stock field in real-time.
4. **Checkout Atomicity & Deductions**: When an order is placed:
   - Variant stock is decremented ($\ge 0$).
   - Parent product stock is recalculated and synchronized.
   - Any attempt to purchase a variant with 0 stock is rejected by server-grade pre-checks.
5. **Order Cancellation**: Cancelling an order restores the variant stock and immediately resynchronizes the parent stock.

---

## Technology Stack

- **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
- **Icons**: [Font Awesome](https://fontawesome.com/) (`@fortawesome/react-fontawesome` & `@fortawesome/free-solid-svg-icons`)
- **Storage**: Client-side storage layer with reactive window event synchronization
- **Testing**: [Puppeteer 25](https://pptr.dev/) automated browser testing suite

---

## Project Architecture & Directory Structure

```text
QuantumTech/
├── dist/                          # Production build output
├── public/                        # Static assets (favicons, banners)
├── scripts/                       # End-to-end automated test suites
│   ├── audit-full-system.mjs      # Viewport & route audit
│   ├── test-admin.mjs             # Admin dashboard & product CRUD test
│   ├── test-admin-orders-reviews.mjs # Order transitions & review moderation test
│   ├── test-complete-journeys.mjs # Full customer purchase journeys
│   ├── test-interactions.mjs      # Cart, checkout, and tracking tests
│   ├── test-language-system.mjs   # English/Bangla localization test
│   ├── test-promotions-system.mjs # Popups, campaigns, and discounts test
│   ├── test-review-system.mjs     # Review submission & verification test
│   └── test-stock-sync.mjs        # Product variant stock synchronization test
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── Breadcrumb.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── Navbar.tsx
│   │   ├── Pagination.tsx
│   │   ├── PriceDisplay.tsx
│   │   ├── ProductCard.tsx
│   │   ├── PromotionalPopup.tsx
│   │   └── QuantitySelector.tsx
│   ├── context/                   # React Context state providers
│   │   ├── AuthContext.tsx
│   │   ├── CartContext.tsx
│   │   ├── LanguageContext.tsx
│   │   └── ToastContext.tsx
│   ├── data/                      # Initial seed and mock data
│   │   └── mockData.ts
│   ├── pages/                     # Storefront & Admin page views
│   │   ├── AboutPage.tsx
│   │   ├── CampaignLandingPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── OrderConfirmationPage.tsx
│   │   ├── PoliciesPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── ShopPage.tsx
│   │   ├── TrackOrderPage.tsx
│   │   └── admin/                 # Admin management views
│   │       ├── AdminAnalyticsPage.tsx
│   │       ├── AdminCampaignsPage.tsx
│   │       ├── AdminCategoriesPage.tsx
│   │       ├── AdminCouponsPage.tsx
│   │       ├── AdminDashboardPage.tsx
│   │       ├── AdminDiscountsPage.tsx
│   │       ├── AdminLoginPage.tsx
│   │       ├── AdminOrderDetailPage.tsx
│   │       ├── AdminOrdersPage.tsx
│   │       ├── AdminPopupsPage.tsx
│   │       ├── AdminProductFormPage.tsx
│   │       ├── AdminProductsPage.tsx
│   │       ├── AdminReviewsPage.tsx
│   │       └── AdminSettingsPage.tsx
│   ├── services/                  # Business logic & data services
│   │   ├── authService.ts
│   │   ├── cartService.ts
│   │   ├── categoryService.ts
│   │   ├── orderService.ts
│   │   ├── productService.ts
│   │   ├── promotionService.ts
│   │   ├── reviewService.ts
│   │   └── settingsService.ts
│   ├── types/                     # TypeScript data interfaces
│   │   └── index.ts
│   ├── utilities/                 # Helpers, formatting, and icons
│   │   ├── currency.ts
│   │   ├── icons.ts
│   │   ├── storage.ts
│   │   └── translations.ts
│   ├── App.tsx                    # Root routing & layout provider
│   ├── index.css                  # Tailwind styles and custom typography
│   └── main.tsx                   # React DOM entry point
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- [npm](https://www.npmjs.com/) (version 9.0.0 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sakib-011/QuantumTech_personal.git
   cd QuantumTech_personal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Start the local Vite development server:
```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build

Create an optimized, minified production build:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## Testing & Quality Assurance

The codebase includes an extensive suite of automated end-to-end tests powered by Puppeteer.

Run all test suites:
```bash
npm test
```

Run specific test modules:
```bash
npm run test:stock          # Product variant stock synchronization tests
npm run test:promotions     # Popups, campaigns, and discount rules tests
npm run test:reviews        # Customer reviews, ratings, and moderation tests
npm run test:admin          # Admin dashboard & product management tests
npm run test:admin-orders   # Order management & payment verification tests
npm run test:language       # Bilingual English/Bangla localization tests
npm run test:customer       # Customer shopping, cart, checkout, and tracking tests
npm run test:journeys       # Comprehensive end-to-end customer purchase journeys
npm run audit               # 360px-1920px responsive & viewport audit
```

---

## Design System & UI Guidelines

QuantumTech strictly adheres to high-conversion modern e-commerce UX guidelines:

- **Typography**: `Inter` for clean international English text; `Hind Siliguri` for Bengali typography.
- **Icons**: [Font Awesome](https://fontawesome.com/) SVG icons only.
- **Symbols**: Strictly **NO emojis** or informal decorative symbols anywhere in the interface.
- **Color Tokens**:
  - `quantum` (`#0284C7`) / `quantum-hover` (`#0369A1`): Primary interactive brand blue.
  - `ink` (`#0F172A`): Deep slate for crisp readable text and dark accents.
  - `surface` (`#FFFFFF`): Clean card and background containers.
  - `success` (`#10B981`), `warning` (`#F59E0B`), `error` (`#EF4444`): Semantic status alerts.
- **Responsiveness**: Zero horizontal overflow on mobile viewports down to 360px.

---

## Admin authentication

Admin sign-in is validated by the backend. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
`JWT_SECRET` in the backend environment before starting the service; see
[`backend/.env.example`](backend/.env.example). No demo administrator password is included.
Set `ADMIN_PASSWORD` locally before running browser QA scripts in `scripts/`.

---

## License

This project is licensed under the [MIT License](LICENSE).
