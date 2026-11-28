export type Language = 'en' | 'bn';

export type DeliveryArea = 'Inside Dhaka' | 'Outside Dhaka';

export type PaymentMethod = 'COD' | 'bKash' | 'Nagad';

export type PaymentStatus = 'Not required' | 'Awaiting verification' | 'Verified' | 'Failed' | 'Pending collection' | 'Verification pending';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export type CategoryStatus = 'Visible' | 'Hidden';

export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ProductVariant {
  id: string;
  productId: string;
  attribute: 'colour' | 'model' | 'size';
  value: string;
  valueBn?: string;
  price: number;
  image?: string;
  stock: number;
}

export interface Product {
  id: string;
  isSeedData?: boolean;
  name: string;
  nameBn: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categoryNameBn: string;
  description: string;
  descriptionBn: string;
  price: number;
  oldPrice?: number;
  stock: number;
  images: string[];
  variants?: ProductVariant[];
  specifications: Record<string, string>;
  specificationsBn?: Record<string, string>;
  rating: number;
  reviewsCount: number;
  isFeatured?: boolean;
  isNew?: boolean;
  status: 'Active' | 'Hidden' | 'Deleted';
  tags: string[];
}

export interface Category {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  sortOrder: number;
  status: CategoryStatus;
  iconName: string;
  productCount?: number;
}

export interface CartItem {
  id: string; // unique item id (productId + variantId)
  product: Product;
  selectedVariant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  discountAmount?: number;
  appliedDiscountId?: string;
  badgeText?: string;
  lineTotal: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  unitPrice: number;
  originalPrice?: number;
  discountAmount?: number;
  appliedDiscountId?: string;
  quantity: number;
  lineTotal: number;
  image: string;
}

export interface OrderStatusLog {
  id: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string;
  changedAt: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. QT-261203-0001
  customerName: string;
  phone: string; // 11 digits: 01[3-9]XXXXXXXX
  area: DeliveryArea;
  address: string;
  note?: string;
  subtotal: number;
  promotionalDiscount?: number;
  couponCode?: string;
  couponDiscount?: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  trxId?: string;
  senderNumber?: string;
  paymentTrxId?: string;
  paymentSender?: string;
  status: OrderStatus;
  cancellationReason?: string;
  source?: string;
  language: Language;
  notificationStatus: 'Sent' | 'Failed' | 'Pending';
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  history?: OrderStatusLog[];
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  reviewerName: string;
  customerEmail?: string; // Private field (never displayed publicly)
  orderId?: string; // Reference to verified order
  orderNumber?: string; // Reference to verified order number
  rating: number; // 1 to 5
  title: string; // Review title
  comment: string; // Review description/body
  images?: string[]; // Customer uploaded photos (data URLs or URLs)
  isVerifiedPurchase?: boolean; // Verified purchase badge flag
  status: ReviewStatus; // 'Pending' | 'Approved' | 'Rejected'
  createdAt: string;
  updatedAt?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  totalCount: number; // Convenient alias for totalReviews
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  percentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  taglineBn: string;
  slogan?: string;
  phone: string;
  email: string;
  ownerNotificationEmail: string;
  bKashNumber: string;
  nagadNumber: string;
  deliveryChargeInsideDhaka: number;
  deliveryChargeOutsideDhaka: number;
  lowStockThreshold: number;
  facebookUrl: string;
  instagramUrl: string;
  whatsappNumber: string;
  messengerUrl: string;
  address: string;
  businessHours: string;

  // Hero Section Customization
  heroBadgeText?: string;
  heroBadgeTextBn?: string;
  heroTitleLine1?: string;
  heroTitleLine1Bn?: string;
  heroTitleLine2?: string;
  heroTitleLine2Bn?: string;
  heroSubtitle?: string;
  heroSubtitleBn?: string;
  heroBannerImage?: string;
  heroBannerBadge?: string;
  heroBannerBadgeBn?: string;
  heroBannerTagline?: string;
  heroBannerTaglineBn?: string;
  heroPrimaryCtaText?: string;
  heroPrimaryCtaTextBn?: string;
  heroPrimaryCtaLink?: string;
  heroSecondaryCtaText?: string;
  heroSecondaryCtaTextBn?: string;
  heroSecondaryCtaLink?: string;
  heroRatingScore?: string;
  heroRatingText?: string;
  heroRatingTextBn?: string;
}

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface AdminSession {
  email: string;
  name: string;
  role: 'Owner' | 'Staff';
  loginTime: number;
  rememberMe?: boolean;
}

export * from './promotions';
