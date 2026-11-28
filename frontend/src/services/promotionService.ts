import {
  Campaign,
  PromotionalPopup,
  ProductDiscount,
  Coupon,
  CouponUsage,
  CampaignAnalyticsEvent,
  CalculatedPriceResult,
  AnalyticsEventType,
} from '../types/promotions';
import { Product, CartItem, ProductVariant, Order } from '../types';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import {
  api,
  clearAnalyticsLive,
  isBackendConnected,
  syncAnalyticsEvent,
  syncCampaign,
  syncCoupon,
  syncDiscount,
  syncPopup,
} from './backend';

const legacyDemoIds = {
  campaigns: new Set(['camp-01', 'camp-02', 'camp-03']),
  popups: new Set(['pop-01', 'pop-02', 'pop-03']),
  discounts: new Set(['disc-01', 'disc-02', 'disc-03']),
  coupons: new Set(['coup-01', 'coup-02', 'coup-03', 'coup-04']),
  orders: new Set(['ord-01', 'ord-02']),
};

function getStoredList<T extends { id: string }>(key: string, demoIds: Set<string>): T[] {
  const stored = getItem<T[]>(key, []);
  const realItems = stored.filter((item) => !demoIds.has(item.id));
  if (realItems.length !== stored.length) setItem(key, realItems);
  return realItems;
}

export const promotionService = {
  // ==========================================
  // 1. CAMPAIGNS
  // ==========================================
  getAllCampaigns(): Campaign[] {
    const campaigns = getStoredList<Campaign>(STORAGE_KEYS.CAMPAIGNS, legacyDemoIds.campaigns);
    const now = new Date().getTime();
    let updated = false;

    // Automatically synchronize status based on current timestamps and heal deprecated image URLs
    const synced = campaigns.map((c) => {
      let camp = c;
      if (camp.campaignImage && camp.campaignImage.includes('1609592426815')) {
        updated = true;
        camp = {
          ...camp,
          campaignImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',
          desktopBanner: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1600&q=80',
          mobileBanner: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
        };
      }
      if (camp.status === 'Paused' || camp.status === 'Draft') return camp;
      const start = new Date(camp.startDate).getTime();
      const end = new Date(camp.endDate).getTime();

      if (now > end && camp.status !== 'Expired') {
        updated = true;
        return { ...camp, status: 'Expired' as const, updatedAt: new Date().toISOString() };
      }
      if (now >= start && now <= end && camp.status === 'Scheduled') {
        updated = true;
        return { ...camp, status: 'Active' as const, updatedAt: new Date().toISOString() };
      }
      return camp;
    });

    if (updated) {
      setItem(STORAGE_KEYS.CAMPAIGNS, synced);
    }

    return synced.sort((a, b) => b.priority - a.priority);
  },

  getActiveCampaigns(): Campaign[] {
    return this.getAllCampaigns().filter((c) => c.status === 'Active');
  },

  getCampaignById(id: string): Campaign | undefined {
    return this.getAllCampaigns().find((c) => c.id === id);
  },

  getCampaignBySlug(slug: string): Campaign | undefined {
    return this.getAllCampaigns().find((c) => c.landingPageSlug === slug);
  },

  async saveCampaign(campaign: Campaign): Promise<Campaign> {
    const all = getStoredList<Campaign>(STORAGE_KEYS.CAMPAIGNS, legacyDemoIds.campaigns);
    const idx = all.findIndex((c) => c.id === campaign.id);
    const now = new Date().toISOString();
    const updatedCampaign: Campaign = {
      ...campaign,
      updatedAt: now,
    };

    let updatedList: Campaign[];
    if (idx >= 0) {
      updatedList = [...all];
      updatedList[idx] = updatedCampaign;
    } else {
      updatedList = [updatedCampaign, ...all];
    }

    const saved = await syncCampaign(updatedCampaign, false, idx < 0);
    const persistedCampaign = saved || updatedCampaign;
    if (idx >= 0) updatedList[idx] = persistedCampaign;
    else updatedList[0] = persistedCampaign;
    setItem(STORAGE_KEYS.CAMPAIGNS, updatedList);
    window.dispatchEvent(new Event('quantum_campaigns_updated'));
    return persistedCampaign;
  },

  async deleteCampaign(id: string): Promise<void> {
    const all = getStoredList<Campaign>(STORAGE_KEYS.CAMPAIGNS, legacyDemoIds.campaigns);
    const deleted = all.find((campaign) => campaign.id === id);
    const filtered = all.filter((c) => c.id !== id);
    if (deleted) await syncCampaign(deleted, true);
    setItem(STORAGE_KEYS.CAMPAIGNS, filtered);
    window.dispatchEvent(new Event('quantum_campaigns_updated'));
  },

  async toggleCampaignStatus(id: string, status: Campaign['status']): Promise<void> {
    const camp = this.getCampaignById(id);
    if (camp) {
      await this.saveCampaign({ ...camp, status });
    }
  },

  // ==========================================
  // 2. PROMOTIONAL POPUPS
  // ==========================================
  getAllPopups(): PromotionalPopup[] {
    const popups = getStoredList<PromotionalPopup>(STORAGE_KEYS.POPUPS, legacyDemoIds.popups);
    return popups.sort((a, b) => b.priority - a.priority);
  },

  getActivePopups(): PromotionalPopup[] {
    const now = new Date().getTime();
    return this.getAllPopups().filter((p) => {
      if (!p.isEnabled) return false;
      if (p.startDate && new Date(p.startDate).getTime() > now) return false;
      if (p.endDate && new Date(p.endDate).getTime() < now) return false;
      return true;
    });
  },

  getPopupById(id: string): PromotionalPopup | undefined {
    return this.getAllPopups().find((p) => p.id === id);
  },

  async savePopup(popup: PromotionalPopup): Promise<PromotionalPopup> {
    const all = getStoredList<PromotionalPopup>(STORAGE_KEYS.POPUPS, legacyDemoIds.popups);
    const idx = all.findIndex((p) => p.id === popup.id);
    const now = new Date().toISOString();
    const updatedPopup: PromotionalPopup = {
      ...popup,
      updatedAt: now,
    };

    let updatedList: PromotionalPopup[];
    if (idx >= 0) {
      updatedList = [...all];
      updatedList[idx] = updatedPopup;
    } else {
      updatedList = [updatedPopup, ...all];
    }

    const saved = await syncPopup(updatedPopup, false, idx < 0);
    const persistedPopup = saved || updatedPopup;
    if (idx >= 0) updatedList[idx] = persistedPopup;
    else updatedList[0] = persistedPopup;
    setItem(STORAGE_KEYS.POPUPS, updatedList);
    window.dispatchEvent(new Event('quantum_popups_updated'));
    return persistedPopup;
  },

  async deletePopup(id: string): Promise<void> {
    const all = getStoredList<PromotionalPopup>(STORAGE_KEYS.POPUPS, legacyDemoIds.popups);
    const deleted = all.find((popup) => popup.id === id);
    const filtered = all.filter((p) => p.id !== id);
    if (deleted) await syncPopup(deleted, true);
    setItem(STORAGE_KEYS.POPUPS, filtered);
    window.dispatchEvent(new Event('quantum_popups_updated'));
  },

  // Evaluates display rules and determines which single popup should appear (if any)
  getEligiblePopup(
    currentPath: string,
    isMobile: boolean,
    isReturning: boolean
  ): PromotionalPopup | null {
    // CRITICAL SAFETY RULE: Never display popups during checkout or confirmation flow
    if (
      currentPath.startsWith('/checkout') ||
      currentPath.startsWith('/order-confirmation') ||
      currentPath.startsWith('/admin')
    ) {
      return null;
    }

    const activePopups = this.getActivePopups();
    if (activePopups.length === 0) return null;

    const dismissalHistory: Record<string, number> = getItem(STORAGE_KEYS.POPUP_DISMISSED, {});
    const now = Date.now();

    for (const popup of activePopups) {
      // 1. Device check
      if (isMobile && !popup.showOnMobile) continue;
      if (!isMobile && !popup.showOnDesktop) continue;

      // 2. Visitor status check
      if (isReturning && !popup.showForReturningVisitors) continue;
      if (!isReturning && !popup.showForNewVisitors) continue;

      // 3. Page Exclusions check
      if (popup.excludedPages && popup.excludedPages.length > 0) {
        const isExcluded = popup.excludedPages.some((p) => {
          if (p.endsWith('/*')) {
            const base = p.slice(0, -2);
            return currentPath.startsWith(base);
          }
          return currentPath === p;
        });
        if (isExcluded) continue;
      }

      // 4. Target Pages check
      if (popup.targetPages && popup.targetPages.length > 0) {
        const matchesTarget = popup.targetPages.some((p) => {
          if (p === '*' || p === 'all') return true;
          if (p.endsWith('/*')) {
            const base = p.slice(0, -2);
            return currentPath.startsWith(base);
          }
          return currentPath === p;
        });
        if (!matchesTarget) continue;
      }

      // 5. Frequency & Dismissal check
      const lastDismissed = dismissalHistory[popup.id];
      if (lastDismissed) {
        if (popup.frequency === 'once_until_closed' || popup.frequency === 'campaign') {
          continue;
        }
        if (popup.frequency === 'daily') {
          const oneDay = 24 * 60 * 60 * 1000;
          if (now - lastDismissed < oneDay) continue;
        }
        if (popup.frequency === 'session') {
          try {
            const sessionKey = `qt_session_dismissed_${popup.id}`;
            if (sessionStorage.getItem(sessionKey)) continue;
          } catch (e) {
            // fallback
          }
        }
      }

      // Winner found (already sorted by priority)
      return popup;
    }

    return null;
  },

  recordPopupDismissal(popupId: string, frequency: PromotionalPopup['frequency']): void {
    const history: Record<string, number> = getItem(STORAGE_KEYS.POPUP_DISMISSED, {});
    history[popupId] = Date.now();
    setItem(STORAGE_KEYS.POPUP_DISMISSED, history);

    if (frequency === 'session') {
      try {
        sessionStorage.setItem(`qt_session_dismissed_${popupId}`, 'true');
      } catch (e) {
        // ignore
      }
    }
  },

  // ==========================================
  // 3. PRODUCT DISCOUNTS & PRICE CALCULATIONS
  // ==========================================
  getAllDiscounts(): ProductDiscount[] {
    const discounts = getStoredList<ProductDiscount>(STORAGE_KEYS.DISCOUNTS, legacyDemoIds.discounts);
    return discounts.sort((a, b) => b.priority - a.priority);
  },

  getActiveDiscounts(): ProductDiscount[] {
    const now = new Date().getTime();
    return this.getAllDiscounts().filter((d) => {
      if (!d.isActive) return false;
      const start = new Date(d.startDate).getTime();
      const end = new Date(d.endDate).getTime();
      return now >= start && now <= end;
    });
  },

  getDiscountById(id: string): ProductDiscount | undefined {
    return this.getAllDiscounts().find((d) => d.id === id);
  },

  async saveDiscount(discount: ProductDiscount): Promise<ProductDiscount> {
    const all = getStoredList<ProductDiscount>(STORAGE_KEYS.DISCOUNTS, legacyDemoIds.discounts);
    const idx = all.findIndex((d) => d.id === discount.id);
    const now = new Date().toISOString();
    const updatedDiscount: ProductDiscount = {
      ...discount,
      updatedAt: now,
    };

    let updatedList: ProductDiscount[];
    if (idx >= 0) {
      updatedList = [...all];
      updatedList[idx] = updatedDiscount;
    } else {
      updatedList = [updatedDiscount, ...all];
    }

    const saved = await syncDiscount(updatedDiscount, false, idx < 0);
    const persistedDiscount = saved || updatedDiscount;
    if (idx >= 0) updatedList[idx] = persistedDiscount;
    else updatedList[0] = persistedDiscount;
    setItem(STORAGE_KEYS.DISCOUNTS, updatedList);
    window.dispatchEvent(new Event('quantum_discounts_updated'));
    return persistedDiscount;
  },

  async deleteDiscount(id: string): Promise<void> {
    const all = getStoredList<ProductDiscount>(STORAGE_KEYS.DISCOUNTS, legacyDemoIds.discounts);
    const deleted = all.find((discount) => discount.id === id);
    const filtered = all.filter((d) => d.id !== id);
    if (deleted) await syncDiscount(deleted, true);
    setItem(STORAGE_KEYS.DISCOUNTS, filtered);
    window.dispatchEvent(new Event('quantum_discounts_updated'));
  },

  // Central Server-grade Discount Calculation Engine
  calculateProductPrice(
    product: Product,
    variantId?: string,
    customDate?: Date
  ): CalculatedPriceResult {
    const now = customDate ? customDate.getTime() : new Date().getTime();

    // Determine base original price
    let basePrice = product.price;
    if (variantId && product.variants) {
      const v = product.variants.find((v) => v.id === variantId);
      if (v) basePrice = v.price;
    }

    const activeDiscounts = this.getActiveDiscounts();
    const activeCampaigns = this.getActiveCampaigns();

    let bestDiscountResult: CalculatedPriceResult | null = null;

    for (const discount of activeDiscounts) {
      // Check date bounds
      const start = new Date(discount.startDate).getTime();
      const end = new Date(discount.endDate).getTime();
      if (now < start || now > end) continue;

      // Check product eligibility
      let isEligible = false;
      let customItem = discount.productItems.find(
        (pi) => pi.productId === product.id && (!pi.variantId || pi.variantId === variantId)
      );

      if (discount.targetType === 'all') {
        isEligible = true;
      } else if (discount.targetType === 'category' && discount.categoryIds) {
        if (discount.categoryIds.includes(product.categoryId)) {
          isEligible = true;
        }
      } else if (customItem) {
        isEligible = true;
      }

      if (!isEligible) continue;

      // Check min stock requirement
      if (discount.minStockRequirement && product.stock < discount.minStockRequirement) {
        continue;
      }

      // Calculate discount amount
      let discountAmount = 0;
      const type = customItem?.customDiscountType || discount.discountType;
      const val = customItem?.customDiscountValue ?? discount.discountValue;

      if (type === 'percentage') {
        discountAmount = Math.round((basePrice * val) / 100);
      } else if (type === 'fixed') {
        discountAmount = Math.min(basePrice, val);
      } else if (type === 'sale_price' && customItem?.salePrice !== undefined) {
        discountAmount = Math.max(0, basePrice - customItem.salePrice);
      } else {
        discountAmount = Math.round((basePrice * val) / 100);
      }

      // Cap at max discount if configured
      if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
        discountAmount = discount.maxDiscountAmount;
      }

      // Prevent negative prices
      discountAmount = Math.min(basePrice, Math.max(0, discountAmount));
      const finalPrice = Math.max(0, basePrice - discountAmount);
      const discountPercent = basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;

      // Associated Campaign
      const camp = discount.campaignId ? activeCampaigns.find((c) => c.id === discount.campaignId) : undefined;
      const badgeText = camp?.badgeText || (discountPercent > 0 ? `-${discountPercent}% OFF` : undefined);

      const candidate: CalculatedPriceResult = {
        originalPrice: basePrice,
        finalPrice,
        discountAmount,
        discountPercent,
        appliedDiscount: discount,
        appliedCampaign: camp,
        badgeText,
        countdownEnd: camp?.showCountdown ? camp.endDate : discount.endDate,
      };

      // Highest priority or highest discount amount wins
      if (
        !bestDiscountResult ||
        discount.priority > (bestDiscountResult.appliedDiscount?.priority || 0) ||
        (discount.priority === (bestDiscountResult.appliedDiscount?.priority || 0) &&
          candidate.discountAmount > bestDiscountResult.discountAmount)
      ) {
        bestDiscountResult = candidate;
      }
    }

    if (bestDiscountResult) {
      return bestDiscountResult;
    }

    // Fallback: If no dynamic promotional campaign applies, check product standard oldPrice
    if (product.oldPrice && product.oldPrice > basePrice) {
      const discountAmount = product.oldPrice - basePrice;
      const discountPercent = Math.round((discountAmount / product.oldPrice) * 100);
      return {
        originalPrice: product.oldPrice,
        finalPrice: basePrice,
        discountAmount,
        discountPercent,
        badgeText: `-${discountPercent}% OFF`,
      };
    }

    // Default regular price
    return {
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      discountPercent: 0,
    };
  },

  // ==========================================
  // 4. COUPONS
  // ==========================================
  getAllCoupons(): Coupon[] {
    return getStoredList<Coupon>(STORAGE_KEYS.COUPONS, legacyDemoIds.coupons);
  },

  getCouponByCode(code: string): Coupon | undefined {
    return this.getAllCoupons().find(
      (c) => c.code.trim().toUpperCase() === code.trim().toUpperCase()
    );
  },

  getLifetimeDeliveredItemCount(phone: string): number {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!cleanPhone) return 0;
    const orders = getStoredList<Order>(STORAGE_KEYS.ORDERS, legacyDemoIds.orders);
    return orders
      .filter((order) =>
        order.status === 'Delivered' &&
        order.phone.replace(/[\s-]/g, '') === cleanPhone
      )
      .reduce(
        (total, order) => total + order.items.reduce((count, item) => count + item.quantity, 0),
        0
      );
  },

  getEligibleCustomerOffers(phone: string): Coupon[] {
    const now = Date.now();
    const deliveredItems = this.getLifetimeDeliveredItemCount(phone);
    return this.getAllCoupons().filter((coupon) =>
      coupon.isActive &&
      coupon.minLifetimeDeliveredItems !== undefined &&
      coupon.minLifetimeDeliveredItems <= deliveredItems &&
      new Date(coupon.startDate).getTime() <= now &&
      new Date(coupon.endDate).getTime() >= now &&
      coupon.usedCount < coupon.usageLimit
    );
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const all = this.getAllCoupons();
    const idx = all.findIndex((c) => c.id === coupon.id || c.code.toUpperCase() === coupon.code.toUpperCase());
    const cleanCoupon: Coupon = {
      ...coupon,
      code: coupon.code.trim().toUpperCase(),
    };

    let updatedList: Coupon[];
    if (idx >= 0) {
      updatedList = [...all];
      updatedList[idx] = cleanCoupon;
    } else {
      updatedList = [cleanCoupon, ...all];
    }

    const saved = await syncCoupon(cleanCoupon, false, idx < 0);
    const persistedCoupon = saved || cleanCoupon;
    if (idx >= 0) updatedList[idx] = persistedCoupon;
    else updatedList[0] = persistedCoupon;
    setItem(STORAGE_KEYS.COUPONS, updatedList);
    window.dispatchEvent(new Event('quantum_coupons_updated'));
    return persistedCoupon;
  },

  async deleteCoupon(id: string): Promise<void> {
    const all = this.getAllCoupons();
    const deleted = all.find((coupon) => coupon.id === id);
    const filtered = all.filter((c) => c.id !== id);
    if (deleted) await syncCoupon(deleted, true);
    setItem(STORAGE_KEYS.COUPONS, filtered);
    window.dispatchEvent(new Event('quantum_coupons_updated'));
  },

  validateCoupon(
    code: string,
    cartItems: CartItem[],
    customerPhone?: string
  ): { valid: boolean; discountAmount: number; error?: string; coupon?: Coupon } {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, discountAmount: 0, error: 'Please enter a coupon code.' };
    }

    const coupon = this.getCouponByCode(cleanCode);
    if (!coupon) {
      return { valid: false, discountAmount: 0, error: 'Invalid coupon code. Please verify.' };
    }

    if (!coupon.isActive) {
      return { valid: false, discountAmount: 0, error: 'This coupon code is currently disabled.' };
    }

    const now = new Date().getTime();
    if (new Date(coupon.startDate).getTime() > now) {
      return { valid: false, discountAmount: 0, error: 'This coupon campaign has not started yet.' };
    }
    if (new Date(coupon.endDate).getTime() < now) {
      return { valid: false, discountAmount: 0, error: 'This coupon has expired.' };
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, error: 'This coupon has reached its maximum total redemption limit.' };
    }

    if (coupon.minLifetimeDeliveredItems !== undefined) {
      if (!customerPhone) {
        return { valid: false, discountAmount: 0, error: 'Enter the phone number on your customer account to use this offer.' };
      }
      const purchasedItems = this.getLifetimeDeliveredItemCount(customerPhone);
      if (purchasedItems < coupon.minLifetimeDeliveredItems) {
        return {
          valid: false,
          discountAmount: 0,
          error: `This offer is for customers with at least ${coupon.minLifetimeDeliveredItems} delivered items. Your qualifying total is ${purchasedItems}.`,
        };
      }
    }

    // Check per-customer limit if phone is provided
    if (customerPhone) {
      const cleanPhone = customerPhone.replace(/[\s-]/g, '');
      const usages = getItem<CouponUsage[]>(STORAGE_KEYS.COUPON_USAGES, []);
      const userUsageCount = usages.filter(
        (u) => u.couponId === coupon.id && u.customerPhone.replace(/[\s-]/g, '') === cleanPhone
      ).length;

      if (userUsageCount >= coupon.perCustomerLimit) {
        return {
          valid: false,
          discountAmount: 0,
          error: `You have already redeemed coupon ${coupon.code} the maximum allowed times (${coupon.perCustomerLimit}).`,
        };
      }
    }

    // Calculate eligible subtotal
    let eligibleSubtotal = 0;
    cartItems.forEach((item) => {
      let isEligible = true;
      if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        if (!coupon.applicableProducts.includes(item.product.id)) isEligible = false;
      }
      if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        if (!coupon.applicableCategories.includes(item.product.categoryId)) isEligible = false;
      }
      if (isEligible) {
        eligibleSubtotal += item.lineTotal;
      }
    });

    if (eligibleSubtotal === 0) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Coupon is not applicable to any items currently in your cart.',
      };
    }

    if (coupon.minimumOrderValue && eligibleSubtotal < coupon.minimumOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Minimum order value of ৳${coupon.minimumOrderValue.toLocaleString('en-IN')} required for coupon ${coupon.code}.`,
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = Math.min(eligibleSubtotal, coupon.discountValue);
    }

    return { valid: true, discountAmount, coupon };
  },

  async validateCouponLive(
    code: string,
    cartItems: CartItem[],
    customerPhone?: string
  ): Promise<{ valid: boolean; discountAmount: number; error?: string; coupon?: Coupon }> {
    if (!isBackendConnected()) {
      return { valid: false, discountAmount: 0, error: 'Coupons are unavailable because the backend is not connected.' };
    }
    try {
      return await api<{ valid: boolean; discountAmount: number; error?: string; coupon?: Coupon }>(
        '/api/promotions/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code,
          customerPhone,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            categoryId: item.product.categoryId,
            lineTotal: item.lineTotal,
          })),
        }),
      });
    } catch (error) {
      return {
        valid: false,
        discountAmount: 0,
        error: error instanceof Error ? error.message : 'Coupon validation failed.',
      };
    }
  },

  recordCouponUsage(
    orderNumber: string,
    couponCode: string,
    customerPhone: string,
    discountAmount: number
  ): void {
    const coupon = this.getCouponByCode(couponCode);
    if (!coupon) return;

    // Increment coupon used count
    coupon.usedCount += 1;
    this.saveCoupon(coupon);

    // Save usage log
    const usages = getItem<CouponUsage[]>(STORAGE_KEYS.COUPON_USAGES, []);
    usages.push({
      id: `usg-${Date.now()}`,
      couponId: coupon.id,
      couponCode: coupon.code,
      orderNumber,
      customerPhone,
      discountAmount,
      usedAt: new Date().toISOString(),
    });
    setItem(STORAGE_KEYS.COUPON_USAGES, usages);

    // Track analytics event
    this.trackEvent('coupon_applied', {
      couponCode: coupon.code,
      revenue: discountAmount,
      pageUrl: window.location.pathname,
    });
  },

  // ==========================================
  // 5. CAMPAIGN ANALYTICS
  // ==========================================
  trackEvent(
    eventType: AnalyticsEventType,
    payload: {
      campaignId?: string;
      popupId?: string;
      productId?: string;
      couponCode?: string;
      orderNumber?: string;
      revenue?: number;
      pageUrl?: string;
    }
  ): void {
    const events = getItem<CampaignAnalyticsEvent[]>(STORAGE_KEYS.CAMPAIGN_ANALYTICS, []);
    events.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      campaignId: payload.campaignId,
      popupId: payload.popupId,
      productId: payload.productId,
      couponCode: payload.couponCode,
      orderNumber: payload.orderNumber,
      revenue: payload.revenue,
      pageUrl: payload.pageUrl || window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    // Cap events list at 2000 items in storage
    if (events.length > 2000) events.shift();
    setItem(STORAGE_KEYS.CAMPAIGN_ANALYTICS, events);
    window.dispatchEvent(new Event('quantum_analytics_updated'));
    if (eventType !== 'coupon_applied' && eventType !== 'order_completed') {
      syncAnalyticsEvent(events[events.length - 1]);
    }
  },

  getAnalyticsSummary() {
    const serverSummary = getItem<{
      impressions?: number;
      closes?: number;
      clicks?: number;
      campaignVisits?: number;
      productClicks?: number;
      couponsUsed?: number;
      orders?: number;
      totalRevenue?: number;
      ctr?: number;
      closeRate?: number;
    } | null>(STORAGE_KEYS.CAMPAIGN_ANALYTICS_SUMMARY, null);
    if (isBackendConnected() && serverSummary) {
      const recentEvents = this.getAnalyticsEvents().slice(-50).reverse();
      return {
        impressions: serverSummary.impressions ?? 0,
        closes: serverSummary.closes ?? 0,
        clicks: serverSummary.clicks ?? 0,
        campaignVisits: serverSummary.campaignVisits ?? 0,
        productClicks: serverSummary.productClicks ?? 0,
        couponsUsed: serverSummary.couponsUsed ?? 0,
        orders: serverSummary.orders ?? 0,
        totalRevenue: serverSummary.totalRevenue ?? 0,
        ctr: serverSummary.ctr ?? 0,
        closeRate: serverSummary.closeRate ?? 0,
        recentEvents,
      };
    }
    const events = getItem<CampaignAnalyticsEvent[]>(STORAGE_KEYS.CAMPAIGN_ANALYTICS, []);

    const impressions = events.filter((e) => e.eventType === 'popup_impression').length;
    const closes = events.filter((e) => e.eventType === 'popup_close').length;
    const clicks = events.filter((e) => e.eventType === 'popup_click').length;
    const campaignVisits = events.filter((e) => e.eventType === 'campaign_visit').length;
    const productClicks = events.filter((e) => e.eventType === 'product_click').length;
    const couponsUsed = events.filter((e) => e.eventType === 'coupon_applied').length;
    const orders = events.filter((e) => e.eventType === 'order_completed').length;
    const totalRevenue = events
      .filter((e) => e.eventType === 'order_completed' && e.revenue)
      .reduce((acc, e) => acc + (e.revenue || 0), 0);

    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(1)) : 0;
    const closeRate = impressions > 0 ? Number(((closes / impressions) * 100).toFixed(1)) : 0;

    return {
      impressions,
      closes,
      clicks,
      campaignVisits,
      productClicks,
      couponsUsed,
      orders,
      totalRevenue,
      ctr,
      closeRate,
      recentEvents: events.slice(-50).reverse(),
    };
  },

  getAnalyticsEvents(): CampaignAnalyticsEvent[] {
    return getItem<CampaignAnalyticsEvent[]>(STORAGE_KEYS.CAMPAIGN_ANALYTICS, []);
  },

  async clearAnalytics(): Promise<void> {
    await clearAnalyticsLive();
    setItem(STORAGE_KEYS.CAMPAIGN_ANALYTICS, []);
    setItem(STORAGE_KEYS.CAMPAIGN_ANALYTICS_SUMMARY, {});
    window.dispatchEvent(new Event('quantum_analytics_updated'));
  },

  // Aliases & Convenient CRUD operations
  getCampaigns(): Campaign[] {
    return this.getAllCampaigns();
  },

  createCampaign(data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    const newCamp: Campaign = {
      ...data,
      id: `camp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.saveCampaign(newCamp);
  },

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined> {
    const existing = this.getCampaignById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.saveCampaign(updated);
  },

  getPopups(): PromotionalPopup[] {
    return this.getAllPopups();
  },

  createPopup(data: Omit<PromotionalPopup, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromotionalPopup> {
    const newPopup: PromotionalPopup = {
      ...data,
      id: `pop-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.savePopup(newPopup);
  },

  async updatePopup(id: string, data: Partial<PromotionalPopup>): Promise<PromotionalPopup | undefined> {
    const existing = this.getPopupById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.savePopup(updated);
  },

  getDiscounts(): ProductDiscount[] {
    return this.getAllDiscounts();
  },

  createDiscount(data: Omit<ProductDiscount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductDiscount> {
    const newDiscount: ProductDiscount = {
      ...data,
      id: `disc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.saveDiscount(newDiscount);
  },

  async updateDiscount(id: string, data: Partial<ProductDiscount>): Promise<ProductDiscount | undefined> {
    const existing = this.getDiscountById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.saveDiscount(updated);
  },

  getCoupons(): Coupon[] {
    return this.getAllCoupons();
  },

  createCoupon(data: Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>): Promise<Coupon> {
    const newCoupon: Coupon = {
      ...data,
      id: `cpn-${Date.now()}`,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    return this.saveCoupon(newCoupon);
  },

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined> {
    const existing = this.getCouponByCode(data.code || '') || this.getAllCoupons().find((c) => c.id === id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    return this.saveCoupon(updated);
  },
};
