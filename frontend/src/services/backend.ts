import { Category, Order, OrderItem, Product, Review, StoreSettings } from '../types';
import { Campaign, CampaignAnalyticsEvent, Coupon, ProductDiscount, PromotionalPopup } from '../types/promotions';
import { getItem, removeItem, setItem, STORAGE_KEYS } from '../utilities/storage';

const TOKEN_KEY = 'qt_admin_token';
const CUSTOMER_TOKEN_KEY = 'qt_customer_token';
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  : '';

let connected = false;

export function isBackendConnected(): boolean {
  return connected;
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function updateAdminProfile(data: { name: string; email: string }): Promise<{ token: string; name: string; email: string; role: string }> {
  const updated = await api<{ token: string; name: string; email: string; role: string }>('/api/admin/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  setAdminToken(updated.token);
  return updated;
}

export function getCustomerToken(): string | null {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string | null): void {
  if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = path.startsWith('/api/admin/')
    ? getAdminToken()
    : path.startsWith('/api/customer/') || path === '/api/orders'
      ? getCustomerToken()
      : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let parsedData: unknown = null;
  if (text) {
    try {
      parsedData = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new ApiError('The server returned an invalid response.', response.status);
      }
    }
  }
  const data = parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)
    ? parsedData as Record<string, unknown>
    : null;
  if (!response.ok) {
    const rawFields = data?.fields;
    const fieldErrors = rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)
      ? Object.fromEntries(
          Object.entries(rawFields).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        )
      : undefined;
    const rawMessage = data?.error || data?.message;
    const isAdminRequest = path.startsWith('/api/admin/');
    if (response.status === 401 && isAdminRequest) {
      setAdminToken(null);
      removeItem(STORAGE_KEYS.ADMIN_SESSION);
      publish('quantum_auth_updated');
    }
    const message = typeof rawMessage === 'string'
      ? rawMessage
      : response.status === 401 && isAdminRequest
        ? 'Your administrator session has expired. Please sign in again.'
        : response.statusText || `Request failed (${response.status})`;
    throw new ApiError(
      message,
      response.status,
      typeof data?.code === 'string' ? data.code : undefined,
      fieldErrors
    );
  }
  return parsedData as T;
}

type RawProduct = Product & { featured?: boolean; new?: boolean };

export function fromApiProduct(raw: RawProduct): Product {
  return {
    ...raw,
    isFeatured: Boolean(raw.isFeatured ?? raw.featured),
    isNew: Boolean(raw.isNew ?? raw.new),
    images: raw.images || [],
    tags: raw.tags || [],
    variants: raw.variants || [],
    specifications: raw.specifications || {},
    status: raw.status || 'Active',
  };
}

function publish(name: string): void {
  window.dispatchEvent(new Event(name));
}

function saveList<T>(key: string, value: T, event: string): void {
  setItem(key, value);
  publish(event);
}

export async function connectBackend(): Promise<boolean> {
  let probe: Response;
  try {
    probe = await fetch(`${API_BASE}/api/settings`, { signal: AbortSignal.timeout(3000) });
  } catch {
    connected = false;
    publish('quantum_backend_connection_updated');
    return false;
  }
  if (!probe.ok) {
    connected = false;
    publish('quantum_backend_connection_updated');
    return false;
  }

  connected = true;
  publish('quantum_backend_connection_updated');
  try {
    await Promise.all([refreshPublicCatalog(), refreshPublicPromotions()]);
  } catch (error) {
    reportBackendError(error);
  }
  if (getAdminToken()) {
    try {
      await Promise.all([refreshAdminCatalog(), refreshAdminPromotions()]);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        reportBackendError(error);
      }
    }
  }
  return true;
}

export async function refreshPublicCatalog(): Promise<void> {
  const [settings, products, categories, reviews, hasAdminProducts] = await Promise.all([
    api<StoreSettings>('/api/settings'),
    api<RawProduct[]>('/api/products'),
    api<Category[]>('/api/categories'),
    api<Review[]>('/api/reviews'),
    api<boolean>('/api/products/has-admin-products'),
  ]);

  const currentSettings = getItem<StoreSettings | null>(STORAGE_KEYS.SETTINGS, null);
  saveList(
    STORAGE_KEYS.SETTINGS,
    { ...(currentSettings || {}), ...settings },
    'quantum_settings_updated'
  );

  setItem(STORAGE_KEYS.SEED_CATALOG_ACTIVE, !hasAdminProducts);
  saveList(STORAGE_KEYS.PRODUCTS, products.map(fromApiProduct), 'quantum_products_updated');
  saveList(STORAGE_KEYS.CATEGORIES, categories, 'quantum_categories_updated');
  if (getAdminToken()) return;
  saveList(STORAGE_KEYS.REVIEWS, reviews, 'quantum_reviews_updated');
}

export async function refreshAdminCatalog(): Promise<void> {
  const [products, categories, reviews, orders] = await Promise.all([
    api<RawProduct[]>('/api/admin/products'),
    api<Category[]>('/api/admin/categories'),
    api<Review[]>('/api/admin/reviews'),
    api<Order[]>('/api/admin/orders'),
  ]);
  setItem(STORAGE_KEYS.SEED_CATALOG_ACTIVE, products.length === 0);
  saveList(STORAGE_KEYS.PRODUCTS, products.map(fromApiProduct), 'quantum_products_updated');
  saveList(STORAGE_KEYS.CATEGORIES, categories, 'quantum_categories_updated');
  saveList(STORAGE_KEYS.REVIEWS, reviews, 'quantum_reviews_updated');
  saveList(STORAGE_KEYS.ORDERS, orders, 'quantum_orders_updated');
}

export async function refreshPublicPromotions(): Promise<void> {
  const [campaigns, popups, discounts] = await Promise.all([
    api<Campaign[]>('/api/campaigns'),
    api<PromotionalPopup[]>('/api/promotions/popups/active'),
    api<ProductDiscount[]>('/api/discounts/active'),
  ]);
  saveList(STORAGE_KEYS.CAMPAIGNS, campaigns, 'quantum_campaigns_updated');
  saveList(STORAGE_KEYS.POPUPS, popups, 'quantum_popups_updated');
  saveList(STORAGE_KEYS.DISCOUNTS, discounts, 'quantum_discounts_updated');
}

export async function refreshAdminPromotions(): Promise<void> {
  const [campaigns, popups, discounts, coupons, summary, events] = await Promise.all([
    api<Campaign[]>('/api/admin/campaigns'),
    api<PromotionalPopup[]>('/api/admin/popups'),
    api<ProductDiscount[]>('/api/admin/discounts'),
    api<Coupon[]>('/api/admin/coupons'),
    api<Record<string, unknown>>('/api/admin/campaign-analytics/summary'),
    api<CampaignAnalyticsEvent[]>('/api/admin/campaign-analytics/events'),
  ]);
  saveList(STORAGE_KEYS.CAMPAIGNS, campaigns, 'quantum_campaigns_updated');
  saveList(STORAGE_KEYS.POPUPS, popups, 'quantum_popups_updated');
  saveList(STORAGE_KEYS.DISCOUNTS, discounts, 'quantum_discounts_updated');
  saveList(STORAGE_KEYS.COUPONS, coupons, 'quantum_coupons_updated');
  setItem(STORAGE_KEYS.CAMPAIGN_ANALYTICS_SUMMARY, summary);
  saveList(STORAGE_KEYS.CAMPAIGN_ANALYTICS, events, 'quantum_analytics_updated');
}

export function rememberOrder(order: Order): void {
  const orders = getItem<Order[]>(STORAGE_KEYS.ORDERS, []);
  const index = orders.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
  if (index >= 0) orders[index] = order;
  else orders.unshift(order);
  saveList(STORAGE_KEYS.ORDERS, orders, 'quantum_orders_updated');
}

export function mapPublicOrder(raw: Record<string, unknown>, language: 'en' | 'bn'): Order {
  const items = ((raw.items as Array<Record<string, unknown>>) || []).map((item, index) => ({
    id: `oi-${raw.id}-${index}`,
    orderId: String(raw.id || ''),
    productId: String(item.productId || ''),
    variantId: item.variantId ? String(item.variantId) : undefined,
    productName: String(item.productName || ''),
    variantName: item.variantName ? String(item.variantName) : undefined,
    unitPrice: Number(item.unitPrice || 0),
    quantity: Number(item.quantity || 0),
    lineTotal: Number(item.lineTotal || 0),
    image: String(item.image || ''),
  })) as OrderItem[];

  return {
    id: String(raw.id || ''),
    orderNumber: String(raw.orderNumber || ''),
    customerName: String(raw.customerName || ''),
    phone: String(raw.phone || ''),
    area: raw.area as Order['area'],
    address: String(raw.address || ''),
    note: raw.note ? String(raw.note) : undefined,
    subtotal: Number(raw.subtotal || 0),
    couponDiscount: raw.couponDiscount ? Number(raw.couponDiscount) : undefined,
    deliveryCharge: Number(raw.deliveryCharge || 0),
    total: Number(raw.total || 0),
    paymentMethod: raw.paymentMethod as Order['paymentMethod'],
    paymentStatus: raw.paymentStatus as Order['paymentStatus'],
    trxId: raw.trxId ? String(raw.trxId) : undefined,
    senderNumber: raw.senderNumber ? String(raw.senderNumber) : undefined,
    status: raw.status as Order['status'],
    cancellationReason: raw.cancellationReason ? String(raw.cancellationReason) : undefined,
    language,
    notificationStatus: 'Pending',
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    items,
  };
}

function quiet(work: Promise<unknown>): void {
  void work.catch((error) => {
    reportBackendError(error);
  });
}

export function reportBackendError(error: unknown): void {
  console.error('QuantumTech API request failed', error);
  const message = error instanceof Error ? error.message : 'The server request failed.';
  window.dispatchEvent(new CustomEvent('quantum_backend_sync_error', { detail: { message } }));
}

async function requireAdminBackend(): Promise<void> {
  if (!connected && !(await connectBackend())) {
    throw new ApiError('The backend is not connected. Please try again when it is available.', 503);
  }
  if (!getAdminToken()) {
    throw new ApiError('Sign in as an administrator before changing store data.', 401);
  }
}

async function syncEntity<T extends { id: string }>(
  path: string,
  entity: T,
  method: 'POST' | 'PUT' | 'DELETE',
  create = false
): Promise<T | undefined> {
  await requireAdminBackend();
  const url = create ? path : `${path}/${encodeURIComponent(entity.id)}`;
  if (method === 'DELETE') {
    await api<void>(url, { method });
    return undefined;
  }
  return api<T>(url, { method, body: JSON.stringify(entity) });
}

export function syncProduct(product: Product, remove = false, create = false): Promise<Product | undefined> {
  return syncEntity('/api/admin/products', product, remove ? 'DELETE' : create ? 'POST' : 'PUT', create);
}

export function syncCategory(category: Category, remove = false, create = false): Promise<Category | undefined> {
  return syncEntity('/api/admin/categories', category, remove ? 'DELETE' : create ? 'POST' : 'PUT', create);
}

export async function syncCategoryOrder(categories: Category[]): Promise<void> {
  await requireAdminBackend();
  await api<void>('/api/admin/categories/reorder', {
    method: 'PUT',
    body: JSON.stringify(categories),
  });
}

export async function syncSettings(settings: StoreSettings): Promise<StoreSettings> {
  await requireAdminBackend();
  return api('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export function syncCampaign(campaign: Campaign, remove = false, create = false): Promise<Campaign | undefined> {
  return syncEntity('/api/admin/campaigns', campaign, remove ? 'DELETE' : create ? 'POST' : 'PUT', create);
}

export function syncPopup(popup: PromotionalPopup, remove = false, create = false): Promise<PromotionalPopup | undefined> {
  return syncEntity('/api/admin/popups', popup, remove ? 'DELETE' : create ? 'POST' : 'PUT', create);
}

export function syncDiscount(discount: ProductDiscount, remove = false, create = false): Promise<ProductDiscount | undefined> {
  return syncEntity('/api/admin/discounts', discount, remove ? 'DELETE' : create ? 'POST' : 'PUT', create);
}

export function syncCoupon(coupon: Coupon, remove = false, create = false): Promise<Coupon | undefined> {
  return syncEntity('/api/admin/coupons', coupon, remove ? 'DELETE' : create ? 'POST' : 'PUT', create);
}

export function syncAnalyticsEvent(event: CampaignAnalyticsEvent): void {
  if (!connected) return;
  quiet(api<CampaignAnalyticsEvent>('/api/campaign-analytics/events', {
    method: 'POST',
    body: JSON.stringify(event),
  }).then((saved) => {
    const events = getItem<CampaignAnalyticsEvent[]>(STORAGE_KEYS.CAMPAIGN_ANALYTICS, []);
    saveList(STORAGE_KEYS.CAMPAIGN_ANALYTICS,
      [...events.filter((item) => item.id !== event.id), saved],
      'quantum_analytics_updated');
  }));
}

export async function clearAnalyticsLive(): Promise<void> {
  await requireAdminBackend();
  await api('/api/admin/campaign-analytics/events', { method: 'DELETE' });
  setItem(STORAGE_KEYS.CAMPAIGN_ANALYTICS_SUMMARY, {});
  saveList(STORAGE_KEYS.CAMPAIGN_ANALYTICS, [], 'quantum_analytics_updated');
}

export function syncReviewCreate(review: Review): void {
  if (!connected) return;
  quiet(api('/api/reviews', {
    method: 'POST',
    body: JSON.stringify({
      productId: review.productId,
      productName: review.productName,
      reviewerName: review.reviewerName,
      customerEmail: review.customerEmail,
      orderNumber: review.orderNumber,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: (review.images || []).filter((img) => img.startsWith('http')),
    }),
  }));
}

export async function syncReviewModerate(id: string, status: 'Approved' | 'Rejected'): Promise<void> {
  await requireAdminBackend();
  await api(`/api/admin/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  await refreshPublicCatalog();
}

export async function syncReviewDelete(id: string): Promise<void> {
  await requireAdminBackend();
  await api(`/api/admin/reviews/${id}`, { method: 'DELETE' });
}

export async function uploadImage(file: File): Promise<string | null> {
  await requireAdminBackend();
  const formData = new FormData();
  formData.append('file', file);
  const headers = new Headers();
  const token = getAdminToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}/api/admin/uploads/image`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) as { url?: string; error?: string } : {};
  if (!response.ok) throw new ApiError(data.error || 'Image upload failed', response.status);
  return data.url || null;
}

export async function uploadReviewImage(file: File): Promise<string> {
  if (!connected && !(await connectBackend())) {
    throw new ApiError('Backend is not connected. Please retry image upload when it is available.', 503);
  }
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/api/reviews/images`, {
    method: 'POST',
    body: formData,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) as { url?: string; error?: string } : {};
  if (!response.ok || !data.url) {
    throw new ApiError(data.error || 'Review image upload failed', response.status);
  }
  return data.url;
}
