import { Order, OrderStatus, PaymentStatus, OrderItem, Language } from '../types';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import { isSeedCatalogProductId, productService } from './productService';
import { promotionService } from './promotionService';
import { api, connectBackend, isBackendConnected, mapPublicOrder, rememberOrder, refreshPublicCatalog } from './backend';

const legacyDemoOrderIds = new Set(['ord-01', 'ord-02']);

function getStoredOrders(): Order[] {
  const stored = getItem<Order[]>(STORAGE_KEYS.ORDERS, []);
  const realOrders = stored.filter((order) => !legacyDemoOrderIds.has(order.id));
  if (realOrders.length !== stored.length) setItem(STORAGE_KEYS.ORDERS, realOrders);
  return realOrders;
}

export interface PaymentMethodInfo {
  code: 'COD' | 'bKash' | 'Nagad';
  name: string;
  nameBn: string;
  available: boolean;
  requiresTrxId: boolean;
  merchantNumber: string | null;
  instructions: string[];
  instructionsBn: string[];
}

export const orderService = {
  getOrders(): Order[] {
    const orders = getStoredOrders();
    // Sort newest first
    return [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  },

  getOrderByNumber(orderNumber: string): Order | undefined {
    return this.getOrders().find(
      o => o.orderNumber.trim().toUpperCase() === orderNumber.trim().toUpperCase()
    );
  },

  trackOrder(orderNumber: string, phone: string): { success: boolean; order?: Order; error?: string } {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const cleanNum = orderNumber.trim().toUpperCase();

    // Rate limiting check per visitor in localStorage
    const lookupKey = 'qt_tracking_lookups';
    const now = Date.now();
    const fifteenMins = 15 * 60 * 1000;
    const lookupHistory: number[] = getItem<number[]>(lookupKey, []).filter(t => now - t < fifteenMins);

    if (lookupHistory.length >= 10) {
      return {
        success: false,
        error: 'Too many lookup attempts. Please wait 15 minutes before trying again.',
      };
    }

    lookupHistory.push(now);
    setItem(lookupKey, lookupHistory);

    const order = this.getOrders().find(
      o => o.orderNumber.toUpperCase() === cleanNum && o.phone.replace(/[\s-]/g, '') === cleanPhone
    );

    if (!order) {
      return {
        success: false,
        error: 'No order found matching this order number and mobile phone number.',
      };
    }

    return { success: true, order };
  },

  async submitOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'notificationStatus'>): Promise<Order> {
    if (orderData.items.some((item) => isSeedCatalogProductId(item.productId))) {
      throw new Error('Sample products are for preview only and cannot be ordered.');
    }
    if (!isBackendConnected()) {
      throw new Error('Checkout is unavailable because the backend is not connected. Please try again shortly.');
    }
    const raw = await api<Record<string, unknown>>('/api/orders', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        customerName: orderData.customerName,
        phone: orderData.phone,
        area: orderData.area,
        address: orderData.address,
        note: orderData.note,
        subtotal: orderData.subtotal,
        deliveryCharge: orderData.deliveryCharge,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
        trxId: orderData.trxId,
        senderNumber: orderData.senderNumber,
        couponCode: orderData.couponCode,
        couponDiscount: orderData.couponDiscount,
        language: orderData.language,
        items: orderData.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });
    const order = mapPublicOrder(raw, orderData.language);
    rememberOrder(order);
    await refreshPublicCatalog().catch(() => undefined);
    return order;
  },

  async trackOrderLive(orderNumber: string, phone: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    if (!isBackendConnected()) {
      return { success: false, error: 'Order tracking is unavailable because the backend is not connected.' };
    }
    try {
      const params = new URLSearchParams({ orderNumber, phone });
      const raw = await api<Record<string, unknown>>(`/api/orders/track?${params.toString()}`);
      const order = mapPublicOrder(raw, 'en');
      rememberOrder(order);
      return { success: true, order };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'No matching order found.' };
    }
  },

  async updateOrderStatusLive(
    orderId: string,
    toStatus: OrderStatus,
    changedBy: string = 'Admin',
    note?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    if (!isBackendConnected() && !(await connectBackend())) {
      return { success: false, error: 'Order updates are unavailable because the backend is not connected.' };
    }
    try {
      const order = await api<Order>(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus, note, reason }),
      });
      rememberOrder(order);
      await refreshPublicCatalog().catch(() => undefined);
      return { success: true, order };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update order status.' };
    }
  },

  async verifyPaymentLive(
    orderId: string,
    status: PaymentStatus,
    changedBy: string = 'Admin',
    note?: string
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    if (!isBackendConnected() && !(await connectBackend())) {
      return { success: false, error: 'Payment updates are unavailable because the backend is not connected.' };
    }
    try {
      const order = await api<Order>(`/api/admin/orders/${orderId}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      });
      rememberOrder(order);
      return { success: true, order };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update payment status.' };
    }
  },

  async getPaymentMethodsLive(): Promise<PaymentMethodInfo[]> {
    if (!isBackendConnected()) throw new Error('Payment options are unavailable because the backend is not connected.');
    return api<PaymentMethodInfo[]>('/api/payments/methods');
  },

  async resubmitPaymentLive(
    orderNumber: string,
    phone: string,
    trxId: string,
    senderNumber: string,
    language: Language = 'en'
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    if (!isBackendConnected()) {
      return { success: false, error: 'Backend is not connected.' };
    }
    try {
      const raw = await api<Record<string, unknown>>(`/api/orders/${encodeURIComponent(orderNumber)}/payment`, {
        method: 'POST',
        body: JSON.stringify({ phone, trxId, senderNumber }),
      });
      const order = mapPublicOrder(raw, language);
      rememberOrder(order);
      return { success: true, order };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to resubmit payment.' };
    }
  },

  async getDashboardStatsLive(): Promise<Record<string, unknown> | null> {
    if (!isBackendConnected()) throw new Error('Dashboard data is unavailable because the backend is not connected.');
    return api<Record<string, unknown>>('/api/admin/dashboard');
  },

  createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'notificationStatus'>): Order {
    if (orderData.items.some((item) => isSeedCatalogProductId(item.productId))) {
      throw new Error('Sample products are for preview only and cannot be ordered.');
    }
    const orders = getStoredOrders();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const count = (orders.length + 1).toString().padStart(4, '0');
    const orderNumber = `QT-${dateStr}-${count}`;

    // Server-grade validation of items, variant stock, and promotional prices
    const products = productService.getAllProductsAdmin();
    let validatedSubtotal = 0;
    let totalPromotionalSavings = 0;

    // Atomically pre-check all items for stock availability
    for (const item of orderData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        throw new Error(`Product "${item.productName || item.productId}" is not available.`);
      }
      if (item.variantId && prod.variants && prod.variants.length > 0) {
        const variant = prod.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Selected variant for "${prod.name}" was not found.`);
        }
        if (variant.stock < item.quantity) {
          throw new Error(
            variant.stock === 0
              ? `Variant "${variant.value}" of "${prod.name}" is out of stock.`
              : `Only ${variant.stock} units available for "${variant.value}" of "${prod.name}".`
          );
        }
      } else {
        if (prod.stock < item.quantity) {
          throw new Error(
            prod.stock === 0
              ? `"${prod.name}" is out of stock.`
              : `Only ${prod.stock} units available for "${prod.name}".`
          );
        }
      }
    }

    const validatedItems: OrderItem[] = orderData.items.map((item, idx) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        // Recalculate price backend-side
        const priceResult = promotionService.calculateProductPrice(prod, item.variantId);
        const unitPrice = priceResult.finalPrice;
        const originalPrice = priceResult.originalPrice;
        const discountAmount = priceResult.discountAmount;
        const lineTotal = unitPrice * item.quantity;

        validatedSubtotal += lineTotal;
        totalPromotionalSavings += discountAmount * item.quantity;

        // Reduce stock atomically
        if (item.variantId && prod.variants && prod.variants.length > 0) {
          const variant = prod.variants.find((v) => v.id === item.variantId);
          if (variant) {
            variant.stock = Math.max(0, variant.stock - item.quantity);
          }
          // Synchronize total product stock from all variants
          prod.stock = productService.calculateTotalStock(prod.variants);
        } else {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }

        return {
          ...item,
          id: item.id || `oi-${Date.now()}-${idx}`,
          orderId: '',
          unitPrice,
          originalPrice,
          discountAmount,
          appliedDiscountId: priceResult.appliedDiscount?.id,
          lineTotal,
        };
      }
      validatedSubtotal += item.lineTotal;
      return item;
    });

    setItem(STORAGE_KEYS.PRODUCTS, products);
    window.dispatchEvent(new Event('quantum_products_updated'));

    // Validate Coupon if provided
    let validatedCouponDiscount = 0;
    let validCouponCode = orderData.couponCode;

    if (validCouponCode) {
      const couponCheck = promotionService.validateCoupon(
        validCouponCode,
        validatedItems as any,
        orderData.phone
      );
      if (couponCheck.valid) {
        validatedCouponDiscount = couponCheck.discountAmount;
        // Record coupon usage
        promotionService.recordCouponUsage(
          orderNumber,
          validCouponCode,
          orderData.phone,
          validatedCouponDiscount
        );
      } else {
        // Invalid or expired coupon cannot be applied!
        validCouponCode = undefined;
        validatedCouponDiscount = 0;
      }
    }

    const finalSubtotal = validatedSubtotal > 0 ? validatedSubtotal : orderData.subtotal;
    const finalTotal = Math.max(
      0,
      finalSubtotal + orderData.deliveryCharge - validatedCouponDiscount
    );

    const now = new Date().toISOString();
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber,
      subtotal: finalSubtotal,
      promotionalDiscount: totalPromotionalSavings,
      couponCode: validCouponCode,
      couponDiscount: validatedCouponDiscount > 0 ? validatedCouponDiscount : undefined,
      total: finalTotal,
      items: validatedItems,
      notificationStatus: 'Sent',
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: `hist-${Date.now()}`,
          orderId: `ord-${Date.now()}`,
          fromStatus: 'Pending',
          toStatus: 'Pending',
          changedBy: 'System',
          changedAt: now,
          note: 'Order placed by customer via guest checkout.',
        },
      ],
    };

    orders.unshift(newOrder);
    setItem(STORAGE_KEYS.ORDERS, orders);

    // Track analytics event
    promotionService.trackEvent('order_completed', {
      revenue: newOrder.total,
      pageUrl: '/checkout',
    });

    window.dispatchEvent(new Event('quantum_products_updated'));
    window.dispatchEvent(new Event('quantum_orders_updated'));

    return newOrder;
  },

  updateOrderStatus(
    orderId: string,
    toStatus: OrderStatus,
    changedBy: string = 'Admin',
    note?: string,
    reason?: string
  ): { success: boolean; error?: string; order?: Order } {
    const orders = getStoredOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const fromStatus = order.status;

    // Disallow transitions on final states
    if (fromStatus === 'Delivered' || fromStatus === 'Cancelled') {
      return {
        success: false,
        error: `Order is already in final state "${fromStatus}" and cannot be modified.`,
      };
    }

    // Strict allowed transitions:
    // Pending -> Confirmed, Cancelled
    // Confirmed -> Shipped, Cancelled
    // Shipped -> Delivered, Cancelled
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      Pending: ['Confirmed', 'Cancelled'],
      Confirmed: ['Shipped', 'Cancelled'],
      Shipped: ['Delivered', 'Cancelled'],
      Delivered: [],
      Cancelled: [],
    };

    if (!allowedTransitions[fromStatus].includes(toStatus)) {
      return {
        success: false,
        error: `Invalid transition: cannot change status from "${fromStatus}" to "${toStatus}". Skipping or reversing workflow stages is not permitted.`,
      };
    }

    // Payment verification enforcement for mobile money (bKash & Nagad)
    if (
      toStatus === 'Confirmed' &&
      (order.paymentMethod === 'bKash' || order.paymentMethod === 'Nagad') &&
      order.paymentStatus !== 'Verified'
    ) {
      return {
        success: false,
        error: `Cannot confirm order: ${order.paymentMethod} payment is unverified. Please inspect TrxID and mark payment as "Verified" first.`,
      };
    }

    // Cancellation: Require reason and restore ordered quantities to stock
    if (toStatus === 'Cancelled') {
      const cancelReason = (reason || note || '').trim();
      if (!cancelReason) {
        return {
          success: false,
          error: 'A valid cancellation reason is required to cancel this order.',
        };
      }

      // Restore items and variants to stock
      const products = productService.getAllProductsAdmin();
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          if (item.variantId && prod.variants && prod.variants.length > 0) {
            const v = prod.variants.find(variant => variant.id === item.variantId);
            if (v) v.stock += item.quantity;
            prod.stock = productService.calculateTotalStock(prod.variants);
          } else {
            prod.stock += item.quantity;
          }
        }
      });
      setItem(STORAGE_KEYS.PRODUCTS, products);
      window.dispatchEvent(new Event('quantum_products_updated'));

      order.cancellationReason = cancelReason;
    }

    order.status = toStatus;
    order.updatedAt = new Date().toISOString();

    if (!order.history) order.history = [];
    order.history.push({
      id: `hist-${Date.now()}`,
      orderId,
      fromStatus,
      toStatus,
      changedBy,
      changedAt: order.updatedAt,
      note: note || reason || `Status transitioned from ${fromStatus} to ${toStatus}`,
    });

    setItem(STORAGE_KEYS.ORDERS, orders);
    window.dispatchEvent(new Event('quantum_orders_updated'));
    return { success: true, order };
  },

  verifyPayment(
    orderId: string,
    status: PaymentStatus,
    changedBy: string = 'Admin',
    note?: string
  ): { success: boolean; error?: string; order?: Order } {
    const orders = getStoredOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const previousStatus = order.paymentStatus;
    order.paymentStatus = status;
    order.updatedAt = new Date().toISOString();

    if (!order.history) order.history = [];
    order.history.push({
      id: `hist-${Date.now()}`,
      orderId,
      fromStatus: order.status,
      toStatus: order.status,
      changedBy,
      changedAt: order.updatedAt,
      note:
        note ||
        `Payment status updated from "${previousStatus}" to "${status}" (${order.paymentMethod} TrxID: ${
          order.trxId || order.paymentTrxId || 'N/A'
        })`,
    });

    setItem(STORAGE_KEYS.ORDERS, orders);
    window.dispatchEvent(new Event('quantum_orders_updated'));
    return { success: true, order };
  },
};
