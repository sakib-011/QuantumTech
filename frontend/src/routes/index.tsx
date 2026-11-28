import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AdminLayout } from '../layouts/AdminLayout';

import { HomePage } from '../pages/HomePage';
import { ShopPage } from '../pages/ShopPage';
import { CategoryPage } from '../pages/CategoryPage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderConfirmedPage } from '../pages/OrderConfirmedPage';
import { TrackOrderPage } from '../pages/TrackOrderPage';
import { PromotionalLandingPage } from '../pages/PromotionalLandingPage';
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { PoliciesPage } from '../pages/PoliciesPage';
import { CustomerAccountPage } from '../pages/CustomerAccountPage';
import { NotFoundPage } from '../pages/NotFoundPage';

import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage';
import { AdminCustomersPage } from '../pages/admin/AdminCustomersPage';
import { AdminOrderDetailPage } from '../pages/admin/AdminOrderDetailPage';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage';
import { AdminProductFormPage } from '../pages/admin/AdminProductFormPage';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage';
import { AdminReviewsPage } from '../pages/admin/AdminReviewsPage';
import { AdminCampaignsPage } from '../pages/admin/AdminCampaignsPage';
import { AdminPopupsPage } from '../pages/admin/AdminPopupsPage';
import { AdminDiscountsPage } from '../pages/admin/AdminDiscountsPage';
import { AdminCouponsPage } from '../pages/admin/AdminCouponsPage';
import { AdminCampaignAnalyticsPage } from '../pages/admin/AdminCampaignAnalyticsPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Customer Storefront Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/campaign/:slug" element={<PromotionalLandingPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmedPage />} />
        <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmedPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/account" element={<CustomerAccountPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/policies/delivery" element={<PoliciesPage defaultTab="delivery" />} />
        <Route path="/policies/returns" element={<PoliciesPage defaultTab="returns" />} />
        <Route path="/policies/privacy" element={<PoliciesPage defaultTab="privacy" />} />
        <Route path="/policies/:section" element={<PoliciesPage />} />
      </Route>

      {/* Admin Authentication Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin Portal Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage isEdit={false} />} />
        <Route path="products/:id/edit" element={<AdminProductFormPage isEdit={true} />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="campaigns" element={<AdminCampaignsPage />} />
        <Route path="popups" element={<AdminPopupsPage />} />
        <Route path="discounts" element={<AdminDiscountsPage />} />
        <Route path="coupons" element={<AdminCouponsPage />} />
        <Route path="campaign-analytics" element={<AdminCampaignAnalyticsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* 404 Catch-All Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
