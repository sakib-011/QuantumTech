import { Product } from './index';

export type PopupLayoutType =
  | 'image_only'
  | 'image_text'
  | 'side_by_side'
  | 'full_offer'
  | 'festival'
  | 'product_discount'
  | 'newsletter'
  | 'custom';

export type PopupTriggerType =
  | 'immediate'
  | 'delay'
  | 'scroll'
  | 'product_page'
  | 'cart_page'
  | 'selected_pages';

export type PopupFrequencyType =
  | 'every_visit'
  | 'session'
  | 'daily'
  | 'campaign'
  | 'once_until_closed';

export interface PromotionalPopup {
  id: string;
  campaignId?: string;
  internalName: string;
  layoutType: PopupLayoutType;
  heading: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  secondaryImageUrl?: string;
  productId?: string;
  productImage?: string;
  badgeText?: string;
  buttonText: string;
  buttonLink: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  imagePosition: 'left' | 'right' | 'top' | 'background';
  textAlignment: 'left' | 'center' | 'right';
  
  // Trigger & Frequency Settings
  triggerType: PopupTriggerType;
  delaySeconds: number;
  scrollPercentage: number;
  frequency: PopupFrequencyType;
  targetPages: string[];
  excludedPages: string[];
  showOnDesktop: boolean;
  showOnMobile: boolean;
  showForNewVisitors: boolean;
  showForReturningVisitors: boolean;
  startDate?: string;
  endDate?: string;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Expired';

export interface Campaign {
  id: string;
  name: string;
  nameBn?: string;
  occasion: string; // e.g. "Eid-ul-Fitr", "Ramadan", "Black Friday", "Flash Sale", "Custom"
  description: string;
  descriptionBn?: string;
  campaignImage: string;
  desktopBanner?: string;
  mobileBanner?: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  status: CampaignStatus;
  priority: number;
  popupId?: string;
  bannerPosition: 'hero' | 'middle' | 'featured' | 'none';
  customCtaText?: string;
  customCtaLink?: string;
  badgeText?: string;
  landingPageSlug?: string;
  showCountdown?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = 'percentage' | 'fixed' | 'sale_price' | 'variant_specific';

export interface DiscountProductItem {
  productId: string;
  variantId?: string;
  customDiscountType?: 'percentage' | 'fixed' | 'sale_price';
  customDiscountValue?: number;
  salePrice?: number;
}

export interface ProductDiscount {
  id: string;
  name: string;
  campaignId?: string;
  discountType: DiscountType;
  discountValue: number;
  targetType: 'specific_products' | 'category' | 'all';
  categoryIds?: string[];
  productItems: DiscountProductItem[];
  startDate: string;
  endDate: string;
  minStockRequirement?: number;
  maxDiscountAmount?: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  offerTitle?: string;
  minLifetimeDeliveredItems?: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderValue?: number;
  maximumDiscount?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  campaignId?: string;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  orderNumber: string;
  customerPhone: string;
  discountAmount: number;
  usedAt: string;
}

export type AnalyticsEventType =
  | 'popup_impression'
  | 'popup_close'
  | 'popup_click'
  | 'campaign_visit'
  | 'product_click'
  | 'coupon_applied'
  | 'order_completed';

export interface CampaignAnalyticsEvent {
  id: string;
  campaignId?: string;
  popupId?: string;
  eventType: AnalyticsEventType;
  productId?: string;
  couponCode?: string;
  orderNumber?: string;
  revenue?: number;
  pageUrl: string;
  timestamp: string;
}

export interface CalculatedPriceResult {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  appliedDiscount?: ProductDiscount;
  appliedCampaign?: Campaign;
  badgeText?: string;
  countdownEnd?: string;
}
