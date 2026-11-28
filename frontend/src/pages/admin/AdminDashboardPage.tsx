import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { reviewService } from '../../services/reviewService';
import { useLanguage } from '../../context/LanguageContext';
import { Icons } from '../../utilities/icons';
import { formatCurrency, formatNumber } from '../../utilities/currency';
import { useToast } from '../../context/ToastContext';
import { isBackendConnected } from '../../services/backend';

export const AdminDashboardPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [orders, setOrders] = useState(() => orderService.getOrders());
  const [products, setProducts] = useState(() => productService.getAllProductsAdmin());
  const [reviews, setReviews] = useState(() => reviewService.getAllReviewsAdmin());
  const [serverStats, setServerStats] = useState<Record<string, unknown> | null>(null);
  const [serverStatsError, setServerStatsError] = useState('');
  const { showToast } = useToast();

  const refreshServerStats = async () => {
    try {
      const stats = await orderService.getDashboardStatsLive();
      if (stats) {
        setServerStats(stats);
        setServerStatsError('');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Dashboard data could not be loaded from the backend.';
      setServerStatsError(message);
      showToast(message, 'error');
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      setProducts(productService.getAllProductsAdmin());
      setOrders(orderService.getOrders());
      setReviews(reviewService.getAllReviewsAdmin());
      void refreshServerStats();
    };
    const handleBackendConnectionUpdate = () => {
      if (isBackendConnected()) void refreshServerStats();
    };
    void refreshServerStats();
    window.addEventListener('quantum_products_updated', handleUpdate);
    window.addEventListener('quantum_orders_updated', handleUpdate);
    window.addEventListener('quantum_reviews_updated', handleUpdate);
    window.addEventListener('quantum_backend_connection_updated', handleBackendConnectionUpdate);
    return () => {
      window.removeEventListener('quantum_products_updated', handleUpdate);
      window.removeEventListener('quantum_orders_updated', handleUpdate);
      window.removeEventListener('quantum_reviews_updated', handleUpdate);
      window.removeEventListener('quantum_backend_connection_updated', handleBackendConnectionUpdate);
    };
  }, []);

  // Metrics
  const activeProducts = products.filter(p => p.status === 'Active');
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const confirmedOrders = orders.filter(o => o.status === 'Confirmed');
  const shippedOrders = orders.filter(o => o.status === 'Shipped');
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled');
  const pendingReviews = reviews.filter(r => r.status === 'Pending');
  const lowStockProducts = products.filter(p => p.stock <= 5);
  const serverNumber = (key: string, fallback: number): number => {
    const value = serverStats?.[key];
    return typeof value === 'number' ? value : fallback;
  };
  const displayedProductCount = serverNumber('totalProducts', products.length);
  const displayedCustomerCount = typeof serverStats?.totalCustomers === 'number'
    ? serverStats.totalCustomers
    : null;
  const displayedOrderCount = serverNumber('totalOrders', orders.length);
  const displayedPendingOrders = serverNumber('pendingOrders', pendingOrders.length);
  const displayedDeliveredOrders = serverNumber('deliveredOrders', deliveredOrders.length);
  const displayedLowStockProducts = serverNumber('lowStockProducts', lowStockProducts.length);

  const localRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const totalRevenue = serverNumber('totalRevenue', localRevenue);

  // Orders older than 24 hours (SRS FR-25)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const ordersOlderThan24h = pendingOrders.filter(
    o => new Date(o.createdAt).getTime() < oneDayAgo
  );

  // Status breakdown calculations for the meaningful chart
  const totalOrdersCount = orders.length || 1;
  const statusStats = [
    { label: 'Pending', count: pendingOrders.length, color: 'bg-amber-500', text: 'text-amber-600', pct: Math.round((pendingOrders.length / totalOrdersCount) * 100) },
    { label: 'Confirmed', count: confirmedOrders.length, color: 'bg-blue-500', text: 'text-blue-600', pct: Math.round((confirmedOrders.length / totalOrdersCount) * 100) },
    { label: 'Shipped', count: shippedOrders.length, color: 'bg-indigo-500', text: 'text-indigo-600', pct: Math.round((shippedOrders.length / totalOrdersCount) * 100) },
    { label: 'Delivered', count: deliveredOrders.length, color: 'bg-emerald-500', text: 'text-emerald-600', pct: Math.round((deliveredOrders.length / totalOrdersCount) * 100) },
    { label: 'Cancelled', count: cancelledOrders.length, color: 'bg-rose-500', text: 'text-rose-600', pct: Math.round((cancelledOrders.length / totalOrdersCount) * 100) },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {serverStatsError && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dashboard metrics may be incomplete: {serverStatsError}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="caption-4 font-semibold text-quantum uppercase tracking-wider block mb-1">
            {language === 'bn' ? 'স্টোর ওভারভিউ ও নিয়ন্ত্রণ' : 'Store Overview & Control'}
          </span>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">{t.admin.dashboard.title}</h1>
          <p className="caption-2 text-muted mt-0.5">
            {t.admin.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products/new"
            className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm font-semibold whitespace-nowrap"
          >
            <FontAwesomeIcon icon={Icons.plus} className="h-3.5 w-3.5" />
            <span>{t.admin.products.addProduct}</span>
          </Link>
        </div>
      </div>

      {/* Orders Older Than 24h Alert Banner (SRS FR-25) */}
      {ordersOlderThan24h.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FontAwesomeIcon icon={Icons.warning} className="h-5 w-5" />
            </div>
            <div>
              <span className="title-3 font-bold block text-amber-900 dark:text-amber-200">
                {t.admin.dashboard.alertPending24h.replace('{{count}}', formatNumber(ordersOlderThan24h.length, language))}
              </span>
              <p className="caption-3 text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                {language === 'bn' 
                  ? 'স্টোর পলিসি অনুযায়ী ২৪ ঘণ্টার মধ্যে অর্ডার নিশ্চিত করা আবশ্যক। নিচের অপেক্ষমাণ অর্ডারগুলো দ্রুত যাচাই করুন:'
                  : 'Per store fulfillment policy, orders should be confirmed within 24 hours. The following order(s) require prompt call confirmation:'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {ordersOlderThan24h.map(o => (
                  <span key={o.id} className="caption-4 px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-mono font-bold border border-amber-300 dark:border-amber-700/50">
                    {o.orderNumber} ({o.customerName})
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link
            to="/admin/orders"
            className="btn-base bg-amber-600 text-white hover:bg-amber-700 button-sm font-semibold whitespace-nowrap shadow-xs"
          >
            <FontAwesomeIcon icon={Icons.phone} className="h-3 w-3" />
            <span>{t.admin.dashboard.alertAction}</span>
          </Link>
        </div>
      )}

      {/* 9 Primary Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* 1. Total Products */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">{t.admin.dashboard.totalProducts}</span>
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.package} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-4 sm:heading-3 font-bold text-ink block">{formatNumber(displayedProductCount, language)}</span>
            <span className="caption-5 text-muted block mt-0.5">
              {formatNumber(activeProducts.length, language)} {t.admin.products.statusActive} • {formatNumber(products.length - activeProducts.length, language)} {t.admin.products.statusHidden}
            </span>
          </div>
        </div>

        {/* 2. Registered Customers */}
        <Link
          to="/admin/customers"
          className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between hover:border-quantum/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">
              {t.admin.nav.customers}
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.user} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-4 sm:heading-3 font-bold text-ink block">
              {displayedCustomerCount === null ? '—' : formatNumber(displayedCustomerCount, language)}
            </span>
            <span className="caption-5 text-muted block mt-0.5">
              {language === 'bn' ? 'নিবন্ধিত গ্রাহক অ্যাকাউন্ট' : 'Registered customer accounts'}
            </span>
          </div>
        </Link>

        {/* 3. Total Orders */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">{t.admin.dashboard.totalOrders}</span>
            <div className="h-9 w-9 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.order} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-4 sm:heading-3 font-bold text-ink block">{formatNumber(displayedOrderCount, language)}</span>
            <span className="caption-5 text-muted block mt-0.5">
              {formatCurrency(totalRevenue, language)}
            </span>
          </div>
        </div>

        {/* 4. Pending Orders */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">{t.admin.dashboard.pendingOrders}</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.clock} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-4 sm:heading-3 font-bold text-amber-600 block">{formatNumber(displayedPendingOrders, language)}</span>
            <span className="caption-5 text-muted block mt-0.5">
              {language === 'bn' ? 'কল করে কনফার্ম করা প্রয়োজন' : 'Awaiting customer phone call'}
            </span>
          </div>
        </div>

        {/* 5. Delivered Orders */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">{t.admin.dashboard.deliveredOrders}</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.circleCheck} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-4 sm:heading-3 font-bold text-emerald-600 block">{formatNumber(displayedDeliveredOrders, language)}</span>
            <span className="caption-5 text-muted block mt-0.5">
              {language === 'bn' ? 'সফলভাবে ডেলিভারিকৃত পার্সেল' : 'Successfully fulfilled parcels'}
            </span>
          </div>
        </div>

        {/* 6. Low-Stock Products (<= 5 units) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">{t.admin.dashboard.lowStockItems}</span>
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.warning} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-4 sm:heading-3 font-bold text-rose-600 block">{formatNumber(displayedLowStockProducts, language)}</span>
            <span className="caption-5 text-muted block mt-0.5">
              {language === 'bn' ? '৫ টি বা তার কম অবশিষ্ট' : '5 units or fewer remaining'}
            </span>
          </div>
        </div>

        {/* 7. Pending Reviews */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">{t.admin.dashboard.pendingReviews}</span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.reviews} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-4 sm:heading-3 font-bold text-purple-600 block">{formatNumber(pendingReviews.length, language)}</span>
            <span className="caption-5 text-muted block mt-0.5">
              {language === 'bn' ? 'মডারেশন প্রয়োজন' : 'Needs admin moderation'}
            </span>
          </div>
        </div>

        {/* 8. Orders Over 24h Count */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">
              {language === 'bn' ? '২৪ ঘণ্টার বেশি' : 'Orders > 24h'}
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.clock} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`heading-4 sm:heading-3 font-bold block ${ordersOlderThan24h.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
              {formatNumber(ordersOlderThan24h.length, language)}
            </span>
            <span className="caption-5 text-muted block mt-0.5">
              {language === 'bn' ? 'জরুরি অগ্রাধিকার' : 'Priority follow-up'}
            </span>
          </div>
        </div>

        {/* 9. Total Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 font-semibold uppercase text-muted tracking-wider">{t.admin.dashboard.totalRevenue}</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FontAwesomeIcon icon={Icons.wallet} className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="heading-5 sm:heading-4 font-bold text-ink block truncate">{formatCurrency(totalRevenue, language)}</span>
            <span className="caption-5 text-muted block mt-0.5">
              {language === 'bn' ? 'সম্পন্ন ও প্রক্রিয়াধীন' : 'Delivered & active'}
            </span>
          </div>
        </div>
      </div>

      {/* Meaningful Visual: Order Status Distribution & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Order Status Distribution Chart (7 cols) */}
        <div className="lg:col-span-7 bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="title-2 font-bold text-ink">{t.admin.dashboard.pipelineTitle}</h2>
              <span className="caption-4 text-muted">
                {formatNumber(orders.length, language)} {language === 'bn' ? 'মোট অর্ডার' : 'total orders'}
              </span>
            </div>
            <p className="caption-3 text-muted mb-6">
              {language === 'bn' 
                ? 'অর্ডারের ৪টি প্রধান জীবনচক্র পর্যায়ের বন্টন'
                : 'Distribution of customer orders across the four lifecycle stages'}
            </p>

            {/* Visual Multi-Segment Progress Bar */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-6">
              {statusStats.map(stat => stat.count > 0 && (
                <div
                  key={stat.label}
                  className={`${stat.color} h-full transition-all duration-500`}
                  style={{ width: `${(stat.count / totalOrdersCount) * 100}%` }}
                  title={`${stat.label}: ${stat.count} orders (${stat.pct}%)`}
                />
              ))}
            </div>

            {/* Legend & Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statusStats.map(stat => (
                <div key={stat.label} className="p-3 rounded-xl bg-surface-alt border border-border/80 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${stat.color}`} />
                    <span className="caption-4 font-semibold text-slate-600">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-auto">
                    <span className="title-2 font-bold text-ink">{formatNumber(stat.count, language)}</span>
                    <span className={`caption-5 font-semibold ${stat.text}`}>{formatNumber(stat.pct, language)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted">
              {language === 'bn' ? 'স্ট্যান্ডার্ড ডেলিভারি সময়: ২৪-৪৮ ঘণ্টা' : 'Standard dispatch SLA: 24-48 hours'}
            </span>
            <Link to="/admin/orders" className="text-quantum font-semibold hover:underline">
              {language === 'bn' ? 'অর্ডার পরিচালনা →' : 'Manage Orders →'}
            </Link>
          </div>
        </div>

        {/* Low-Stock Critical Watchlist (5 cols) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="title-2 font-bold text-ink flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.warning} className="h-4 w-4 text-rose-500" />
              <span>{t.admin.dashboard.lowStockTitle}</span>
            </h2>
            <Link to="/admin/products" className="caption-4 text-quantum hover:underline font-semibold">
              {t.catalog.viewAll}
            </Link>
          </div>
          <p className="caption-3 text-muted mb-4">
            {language === 'bn' ? 'ইনভেন্টরিতে ৫ বা তার কম পণ্য অবশিষ্ট রয়েছে' : 'Products with 5 or fewer items remaining in inventory'}
          </p>

          {lowStockProducts.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-muted">
              <FontAwesomeIcon icon={Icons.circleCheck} className="h-6 w-6 text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700">Healthy Stock Levels</p>
              <p className="caption-4 mt-0.5">All products currently have more than 5 units available.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border max-h-[300px] overflow-y-auto pr-1">
              {lowStockProducts.map(p => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.images[0] || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=200&q=80'}
                      alt={p.name}
                      className="h-10 w-10 rounded-lg object-cover border border-border flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="caption-2 font-semibold text-ink block truncate">{p.name}</span>
                      <span className="caption-5 text-muted">{p.categoryName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={`caption-4 px-2 py-0.5 rounded-full font-bold ${
                      p.stock === 0
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {p.stock === 0 ? 'Out of Stock' : `${p.stock} left`}
                    </span>
                    <Link
                      to={`/admin/products/${p.id}/edit`}
                      className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-xsm"
                      title="Update stock"
                    >
                      Restock
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="title-1 font-bold text-ink">{t.admin.dashboard.recentOrdersTitle}</h2>
            <p className="caption-3 text-muted">
              {language === 'bn' ? 'সারাদেশের সাম্প্রতিক ক্রেতাদের ক্রয়াদেশ' : 'Latest customer purchases across Bangladesh'}
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm font-semibold"
          >
            <span>{t.admin.dashboard.viewAllOrders}</span>
            <FontAwesomeIcon icon={Icons.arrowRight} className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border caption-3 font-semibold text-muted uppercase tracking-wider">
                <th className="pb-3 px-3">{t.admin.orders.colOrderNum}</th>
                <th className="pb-3 px-3">{t.admin.orders.colCustomer}</th>
                <th className="pb-3 px-3">{language === 'bn' ? 'এলাকা' : 'Area'}</th>
                <th className="pb-3 px-3">{t.admin.orders.colTotal}</th>
                <th className="pb-3 px-3">{t.admin.orders.colPayment}</th>
                <th className="pb-3 px-3">{t.admin.orders.colOrderStatus}</th>
                <th className="pb-3 px-3 text-right">{t.admin.orders.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-surface-alt/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-quantum whitespace-nowrap">
                    {order.orderNumber}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-ink block">{order.customerName}</span>
                    <span className="caption-5 text-muted">{order.phone}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                    {order.area}
                  </td>
                  <td className="py-3 px-3 font-bold text-ink whitespace-nowrap">
                    {formatCurrency(order.total, language)}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="caption-3 font-medium text-ink block">{order.paymentMethod}</span>
                    <span className={`caption-5 font-semibold ${
                      order.paymentStatus === 'Verified' ? 'text-success' : 'text-amber-600'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`caption-4 px-2.5 py-0.5 rounded-full font-bold ${
                      order.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : order.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'Shipped'
                        ? 'bg-indigo-100 text-indigo-800'
                        : order.status === 'Confirmed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <Link
                      to="/admin/orders"
                      className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-xsm font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
