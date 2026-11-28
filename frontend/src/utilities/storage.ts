export const STORAGE_KEYS = {
  LANGUAGE: 'qt_language',
  CART: 'qt_cart',
  ORDERS: 'qt_orders',
  PRODUCTS: 'qt_products',
  SEED_CATALOG_ACTIVE: 'qt_seed_catalog_active',
  CATEGORIES: 'qt_categories',
  REVIEWS: 'qt_reviews',
  SETTINGS: 'qt_settings',
  RECENT_SEARCHES: 'qt_recent_searches',
  ADMIN_SESSION: 'qt_admin_session',
  CAMPAIGNS: 'qt_campaigns',
  POPUPS: 'qt_popups',
  DISCOUNTS: 'qt_discounts',
  COUPONS: 'qt_coupons',
  COUPON_USAGES: 'qt_coupon_usages',
  CAMPAIGN_ANALYTICS: 'qt_campaign_analytics',
  CAMPAIGN_ANALYTICS_SUMMARY: 'qt_campaign_analytics_summary',
  POPUP_DISMISSED: 'qt_popup_dismissed_v1',
} as const;

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting key "${key}" in localStorage:`, error);
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing key "${key}" from localStorage:`, error);
  }
}
