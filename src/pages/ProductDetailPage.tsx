import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { productService } from '../services/productService';
import { reviewService } from '../services/reviewService';
import { promotionService } from '../services/promotionService';
import { CampaignCountdownTimer } from '../components/CampaignCountdownTimer';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { PriceDisplay } from '../components/PriceDisplay';
import { QuantitySelector } from '../components/QuantitySelector';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/EmptyState';
import { Icons } from '../utilities/icons';
import { ProductVariant, Review, ReviewStats } from '../types';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState(() => productService.getProductBySlug(slug || ''));
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [reviews, setReviews] = useState<Review[]>(() => reviewService.getApprovedReviews(product?.id, 'newest'));
  const [reviewStats, setReviewStats] = useState<ReviewStats>(() => reviewService.getReviewStats(product?.id || ''));
  const [reviewPageLimit, setReviewPageLimit] = useState(4);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [previewReviewImage, setPreviewReviewImage] = useState<string | null>(null);

  // Review Form States
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewOrderNumber, setReviewOrderNumber] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewRatingHover, setReviewRatingHover] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSync = () => {
      const p = productService.getProductBySlug(slug || '');
      setProduct(p);
      if (p) {
        setReviews(reviewService.getApprovedReviews(p.id, reviewSort));
        setReviewStats(reviewService.getReviewStats(p.id));
      }
    };
    window.addEventListener('quantum_products_updated', handleSync);
    window.addEventListener('quantum_reviews_updated', handleSync);
    return () => {
      window.removeEventListener('quantum_products_updated', handleSync);
      window.removeEventListener('quantum_reviews_updated', handleSync);
    };
  }, [slug, reviewSort]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <EmptyState
          icon={Icons.search}
          title={language === 'bn' ? 'পণ্য খুঁজে পাওয়া যায়নি' : 'Product Not Found'}
          description={
            language === 'bn'
              ? 'আপনার অনুরোধকৃত পণ্যটি সরানো হয়েছে অথবা লিংকটি সঠিক নয়।'
              : 'The requested tech accessory could not be found or has been removed.'
          }
          actionText={language === 'bn' ? 'সব পণ্য দেখুন' : 'Back to Shop'}
          onAction={() => navigate('/shop')}
        />
      </div>
    );
  }

  // Variant & Image state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0
      ? (product.variants.find((v) => v.stock > 0) || product.variants[0])
      : undefined
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');

  // Swipeable Mobile Gallery Touch Handling
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const images = useMemo(() => {
    const list = product.images && product.images.length > 0 ? [...product.images] : [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'
    ];
    if (selectedVariant?.image && !list.includes(selectedVariant.image)) {
      list.push(selectedVariant.image);
    }
    return list;
  }, [product.images, selectedVariant?.image]);

  // Auto-switch image if variant has associated image
  useEffect(() => {
    if (selectedVariant?.image) {
      const idx = images.indexOf(selectedVariant.image);
      if (idx >= 0) {
        setSelectedImageIndex(idx);
      }
    }
  }, [selectedVariant, images]);

  // Dynamic promotional price calculation
  const promoPriceResult = promotionService.calculateProductPrice(product, selectedVariant?.id);
  const activePrice = promoPriceResult.finalPrice;
  const promoOriginalPrice =
    promoPriceResult.originalPrice > activePrice
      ? promoPriceResult.originalPrice
      : product.oldPrice && product.oldPrice > activePrice
      ? product.oldPrice
      : undefined;
  const promoBadge = promoPriceResult.badgeText;
  const countdownEnd = promoPriceResult.countdownEnd;

  const activeStock = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = activeStock <= 0;
  const isLowStock = activeStock > 0 && activeStock <= 5;
  const productName = language === 'bn' ? product.nameBn : product.name;
  const productDesc = language === 'bn' ? product.descriptionBn : product.description;
  const specifications = language === 'bn' && product.specificationsBn ? product.specificationsBn : product.specifications;

  const currentCategory = productService.getCategories().find((c) => c.id === product.categoryId);
  const categorySlug = currentCategory ? currentCategory.slug : product.categoryId;
  const relatedProducts = productService.getRelatedProducts(product.id, 4);

  // Gallery Navigation
  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next Image
      handleNextImage();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Prev Image
      handlePrevImage();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Add to Cart
  const handleAddToCart = () => {
    if (!isOutOfStock) {
      addToCart(product, selectedVariant, quantity);
    }
  };

  // Variant change
  const handleVariantSelect = (v: ProductVariant) => {
    setSelectedVariant(v);
    if (quantity > v.stock && v.stock > 0) {
      setQuantity(v.stock);
    }
    if (v.image) {
      const idx = images.indexOf(v.image);
      if (idx !== -1) {
        setSelectedImageIndex(idx);
      }
    }
  };

  // Social Sharing
  const currentUrl = window.location.href;
  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = `${productName} (৳${activePrice.toLocaleString()}) - QuantumTech: ${currentUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDirectWhatsAppChat = () => {
    const message = `Hello QuantumTech, I have an inquiry regarding: ${productName} (${currentUrl})`;
    window.open(`https://wa.me/8801700000000?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDirectMessengerChat = () => {
    window.open('https://m.me/quantumtechbd', '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    showToast(t.product.linkCopied, 'success');
  };

  // Image upload handling for customer review
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - reviewImages.length;
    if (remainingSlots <= 0) {
      showToast(language === 'bn' ? 'সর্বোচ্চ ৪ টি ছবি আপলোড করতে পারবেন' : 'Maximum 4 images allowed per review', 'error');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const validFormats = ['image/jpeg', 'image/png', 'image/webp'];

    for (const file of filesToProcess) {
      if (!validFormats.includes(file.type)) {
        showToast(
          language === 'bn'
            ? 'অনুপযুক্ত ফাইল ফরম্যাট। শুধুমাত্র JPG, PNG বা WEBP সমর্থনযোগ্য।'
            : 'Unsupported image format. Please upload JPG, PNG, or WEBP only.',
          'error'
        );
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(language === 'bn' ? 'ফাইলের আকার ৫ মেগাবাইট এর বেশি হতে পারবে না।' : 'Image size cannot exceed 5MB.', 'error');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReviewImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeReviewImage = (indexToRemove: number) => {
    setReviewImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const getRatingLabel = (star: number) => {
    switch (star) {
      case 1:
        return language === 'bn' ? '১ স্টার - খুব খারাপ' : '1 Star - Poor';
      case 2:
        return language === 'bn' ? '২ স্টার - মোটামুটি' : '2 Stars - Fair';
      case 3:
        return language === 'bn' ? '৩ স্টার - সাধারণ' : '3 Stars - Average';
      case 4:
        return language === 'bn' ? '৪ স্টার - ভালো' : '4 Stars - Good';
      case 5:
        return language === 'bn' ? '৫ স্টার - অসাধারণ' : '5 Stars - Excellent';
      default:
        return '';
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const errors: Record<string, string> = {};

    if (!reviewName.trim() || reviewName.trim().length < 2) {
      errors.name = language === 'bn' ? 'কমপক্ষে ২ অক্ষরের নাম লিখুন।' : 'Please enter your name (minimum 2 characters).';
    }

    if (!reviewTitle.trim() || reviewTitle.trim().length < 3) {
      errors.title = language === 'bn' ? 'রিভিউয়ের শিরোনাম দিন (কমপক্ষে ৩ অক্ষর)।' : 'Please provide a review title (minimum 3 characters).';
    }

    if (!reviewComment.trim() || reviewComment.trim().length < 10) {
      errors.comment = language === 'bn' ? 'অনুগ্রহ করে কমপক্ষে ১০ অক্ষরের বিস্তারিত রিভিউ লিখুন।' : 'Please write at least 10 characters in your review.';
    }

    if (reviewEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reviewEmail.trim())) {
        errors.email = language === 'bn' ? 'সঠিক ইমেইল ঠিকানা প্রদান করুন।' : 'Please provide a valid email address.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setReviewErrors(errors);
      return;
    }

    setIsSubmittingReview(true);
    const result = reviewService.addReview({
      productId: product.id,
      productName: product.name,
      reviewerName: reviewName.trim(),
      customerEmail: reviewEmail.trim() || undefined,
      orderNumber: reviewOrderNumber.trim() || undefined,
      rating: reviewRating,
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
      images: reviewImages,
    });
    setIsSubmittingReview(false);

    if (!result.success) {
      showToast(result.error || 'Failed to submit review.', 'error');
      setReviewErrors({ form: result.error || 'Failed to submit review.' });
      return;
    }

    // Reset & close
    setIsReviewModalOpen(false);
    setReviewName('');
    setReviewEmail('');
    setReviewOrderNumber('');
    setReviewRating(5);
    setReviewRatingHover(0);
    setReviewTitle('');
    setReviewComment('');
    setReviewImages([]);
    setReviewErrors({});

    showToast(
      language === 'bn'
        ? 'আপনার রিভিউ জমা হয়েছে! অ্যাডমিন অনুমোদনের পর প্রদর্শিত হবে।'
        : 'Review submitted! It will appear publicly once approved by our moderation team.',
      'success'
    );
  };

  // Variant Attribute Labels
  const getVariantLabel = (attr: string) => {
    switch (attr) {
      case 'colour':
        return language === 'bn' ? 'রং বাছাই করুন' : 'Select Color';
      case 'model':
        return language === 'bn' ? 'মডেল বাছাই করুন' : 'Select Model';
      case 'size':
        return language === 'bn' ? 'সাইজ / দৈর্ঘ্য বাছাই করুন' : 'Select Size / Length';
      default:
        return t.product.selectVariant;
    }
  };

  const variantAttribute = product.variants && product.variants.length > 0 ? product.variants[0].attribute : 'colour';
  const discountAmount = promoOriginalPrice && promoOriginalPrice > activePrice ? promoOriginalPrice - activePrice : 0;
  const discountPercent = promoOriginalPrice && promoOriginalPrice > activePrice ? Math.round((discountAmount / promoOriginalPrice) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: t.nav.shop, href: '/shop' },
          {
            label: language === 'bn' ? product.categoryNameBn : product.categoryName,
            href: `/category/${categorySlug}`,
          },
          { label: productName },
        ]}
      />

      {/* Main Product Showcase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-6 items-start">
        {/* Left: Product Image Gallery (Up to 6 images, swipeable on mobile) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div
            className="relative aspect-square w-full rounded-2xl overflow-hidden bg-surface border border-border p-2 shadow-sm select-none group"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[selectedImageIndex] || images[0] || 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80'}
              alt={`${productName} view ${selectedImageIndex + 1}`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80';
              }}
              className="h-full w-full object-cover rounded-xl transition-all duration-300"
            />

            {/* Badges on Gallery */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 pointer-events-none">
              {product.isNew && (
                <span className="caption-3 px-2.5 py-0.5 rounded bg-ink text-white font-semibold shadow-sm">
                  NEW
                </span>
              )}
              {promoBadge ? (
                <span data-testid="pdp-promo-badge" className="caption-3 px-2.5 py-0.5 rounded bg-error text-white font-bold shadow-sm">
                  {promoBadge}
                </span>
              ) : discountPercent > 0 ? (
                <span data-testid="pdp-promo-badge" className="caption-3 px-2.5 py-0.5 rounded bg-error text-white font-semibold shadow-sm">
                  -{discountPercent}% OFF
                </span>
              ) : null}
            </div>

            {/* Slide Index Counter Badge */}
            <div className="absolute top-4 right-4 z-10 bg-ink/75 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {selectedImageIndex + 1} / {images.length}
            </div>

            {/* Next / Previous Arrows (Visible on hover and touch devices) */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card border border-border hover:bg-surface active:scale-90 transition-all opacity-90 sm:opacity-0 group-hover:opacity-100 z-20 focus:opacity-100"
                  aria-label="Previous product image"
                >
                  <FontAwesomeIcon icon={Icons.chevronLeft} className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card border border-border hover:bg-surface active:scale-90 transition-all opacity-90 sm:opacity-0 group-hover:opacity-100 z-20 focus:opacity-100"
                  aria-label="Next product image"
                >
                  <FontAwesomeIcon icon={Icons.chevronRight} className="h-4 w-4" />
                </button>

                {/* Mobile Dot Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 sm:hidden">
                  {images.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        selectedImageIndex === idx ? 'w-5 bg-quantum' : 'w-2 bg-ink/30'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Navigation Row (Up to 6 images) */}
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-18 w-18 sm:h-20 sm:w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all p-0.5 bg-surface ${
                    selectedImageIndex === idx
                      ? 'border-quantum ring-2 ring-quantum-soft shadow-sm'
                      : 'border-border hover:border-slate-400 opacity-75 hover:opacity-100'
                  }`}
                  aria-label={`View image thumbnail ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=400&q=80';
                    }}
                    className="h-full w-full object-cover rounded-lg"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Information & Purchase Controls */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Category Chip & Stock Status */}
          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/category/${categorySlug}`}
              className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-semibold hover:bg-quantum hover:text-white transition-colors"
            >
              {language === 'bn' ? product.categoryNameBn : product.categoryName}
            </Link>

            {/* Stock status indicator */}
            {isOutOfStock ? (
              <span data-testid="stock-indicator" className="caption-3 px-2.5 py-1 rounded-full bg-error-soft text-error font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-error" />
                {t.product.outOfStock}
              </span>
            ) : isLowStock ? (
              <span data-testid="stock-indicator" className="caption-3 px-2.5 py-1 rounded-full bg-warning-soft text-warning-dark font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                {language === 'bn' ? `স্টকে মাত্র ${activeStock} টি বাকি` : `Only ${activeStock} left`}
              </span>
            ) : (
              <span data-testid="stock-indicator" className="caption-3 px-2.5 py-1 rounded-full bg-success-soft text-success-dark font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {t.product.inStock} {selectedVariant ? `(${activeStock} available)` : `(${product.stock} available)`}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h1 className="heading-4 sm:heading-3 font-bold text-ink leading-tight text-balance">
            {productName}
          </h1>

          {/* Rating & Reviews Count */}
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400 text-sm">
              {[1, 2, 3, 4, 5].map((i) => {
                const effectiveRating = reviewStats.totalCount > 0 ? reviewStats.averageRating : product.rating;
                return (
                  <FontAwesomeIcon
                    key={i}
                    icon={Icons.star}
                    className={`h-3.5 w-3.5 ${
                      i <= Math.round(effectiveRating) ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  />
                );
              })}
            </div>
            <span className="title-4 font-bold text-ink">
              {(reviewStats.totalCount > 0 ? reviewStats.averageRating : product.rating).toFixed(1)}
            </span>
            <span className="caption-2 text-muted">
              ({reviewStats.totalCount > 0 ? reviewStats.totalCount : product.reviewsCount}{' '}
              {language === 'bn' ? 'টি অনুমোদিত রিভিউ' : 'verified reviews'})
            </span>
          </div>

          {/* Price Box with Discount Information & Optional Countdown Timer */}
          <div className="p-4 rounded-xl bg-surface border border-border shadow-sm">
            {countdownEnd && (
              <div data-testid="pdp-promo-timer" className="mb-3 pb-2.5 border-b border-border/80">
                <CampaignCountdownTimer
                  targetDate={countdownEnd}
                  label={language === 'bn' ? 'অফার শেষ হতে বাকি:' : 'Limited Time Flash Offer Ends In:'}
                />
              </div>
            )}

            <div className="flex flex-wrap items-baseline gap-3">
              <PriceDisplay price={activePrice} oldPrice={promoOriginalPrice} size="xl" />

              {discountAmount > 0 && (
                <span className="caption-2 font-semibold text-error bg-error-soft px-2.5 py-1 rounded-lg">
                  {language === 'bn'
                    ? `৳${discountAmount.toLocaleString('en-IN')} সাশ্রয় (-${discountPercent}%)`
                    : `Save ৳${discountAmount.toLocaleString('en-IN')} (-${discountPercent}%)`}
                </span>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs text-muted">
              <FontAwesomeIcon icon={Icons.truck} className="h-3.5 w-3.5 text-quantum" />
              <span>{t.product.deliveryEstimate}</span>
            </div>
          </div>

          {/* Variant Selector (Supports Color, Model, and Size) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="caption-3 uppercase tracking-wider text-muted font-bold">
                  {getVariantLabel(variantAttribute)}
                </label>
                {selectedVariant && (
                  <span className="text-xs font-semibold text-quantum flex items-center gap-2">
                    <span>{language === 'bn' ? selectedVariant.valueBn || selectedVariant.value : selectedVariant.value}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      selectedVariant.stock <= 0
                        ? 'bg-error-soft text-error'
                        : selectedVariant.stock <= 5
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedVariant.stock <= 0
                        ? (language === 'bn' ? 'স্টক শেষ' : 'Out of Stock')
                        : (language === 'bn' ? `স্টক: ${selectedVariant.stock}` : `Stock: ${selectedVariant.stock}`)}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isVarOutOfStock = v.stock <= 0;
                  const label = language === 'bn' ? v.valueBn || v.value : v.value;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      data-testid={`variant-btn-${v.id}`}
                      onClick={() => handleVariantSelect(v)}
                      className={`btn-base button-sm px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        isSelected
                          ? isVarOutOfStock
                            ? 'border-error bg-error-soft/30 text-error shadow-sm ring-2 ring-error/30'
                            : 'border-quantum bg-quantum text-white shadow-sm ring-2 ring-quantum-soft'
                          : isVarOutOfStock
                          ? 'border-border bg-surface-muted text-muted cursor-pointer line-through opacity-70 hover:opacity-100'
                          : 'border-border bg-surface text-ink hover:border-quantum hover:bg-quantum-soft hover:text-quantum'
                      }`}
                    >
                      <span>{label}</span>
                      {(() => {
                        const vPromo = promotionService.calculateProductPrice(product, v.id);
                        return (
                          <span className="caption-4 ml-1 opacity-90">
                            (৳{vPromo.finalPrice.toLocaleString('en-IN')})
                          </span>
                        );
                      })()}
                      {isVarOutOfStock && (
                        <span className="caption-5 ml-1 text-error font-semibold">
                          ({t.product.outOfStock})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Notification Banner */}
          {isOutOfStock ? (
            <div className="p-3.5 rounded-xl bg-error-soft text-error text-sm font-semibold flex items-center gap-2.5">
              <FontAwesomeIcon icon={Icons.warning} className="h-4 w-4 flex-shrink-0" />
              <span>
                {language === 'bn'
                  ? 'এই ভেরিয়েন্টটি বর্তমানে স্টকে নেই। অনুগ্রহ করে অন্য ভেরিয়েন্ট বাছাই করুন।'
                  : 'This variant is currently out of stock. Please select another variant.'}
              </span>
            </div>
          ) : isLowStock ? (
            <div className="p-3.5 rounded-xl bg-warning-soft text-warning-dark text-sm font-medium flex items-center gap-2.5">
              <FontAwesomeIcon icon={Icons.warning} className="h-4 w-4 flex-shrink-0" />
              <span>
                {language === 'bn'
                  ? `স্টকে মাত্র ${activeStock} টি পণ্য বাকি আছে! দ্রুত অর্ডার সম্পন্ন করুন।`
                  : `Hurry! Only ${activeStock} units available in stock. Order now before it runs out.`}
              </span>
            </div>
          ) : null}

          {/* Quantity Selector & Add to Cart (Desktop) */}
          <div className="hidden sm:flex items-center gap-4 pt-2">
            <div className="flex flex-col">
              <span className="caption-4 text-muted mb-1 font-semibold">{t.product.quantity}</span>
              <QuantitySelector
                quantity={quantity}
                max={activeStock}
                onChange={setQuantity}
                disabled={isOutOfStock}
              />
            </div>

            <div className="flex-1 self-end">
              <button
                type="button"
                data-testid="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`btn-base w-full h-12 button-md text-white shadow-sm font-semibold ${
                  isOutOfStock
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-border'
                    : 'bg-quantum hover:bg-quantum-hover active:scale-98'
                }`}
              >
                <FontAwesomeIcon icon={Icons.cart} className="h-4 w-4" />
                <span>{isOutOfStock ? t.product.outOfStock : t.product.addToCart}</span>
              </button>
            </div>
          </div>

          {/* Social Share & Direct Chat Actions */}
          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="caption-3 font-semibold text-muted uppercase tracking-wider">
                {t.product.share}:
              </span>
              <div className="flex items-center gap-2">
                {/* Facebook Share */}
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="btn-base bg-surface border border-border text-ink hover:text-blue-600 hover:border-blue-300 button-xsm text-xs"
                  aria-label={t.product.shareFacebook}
                >
                  <FontAwesomeIcon icon={Icons.facebook} className="h-3.5 w-3.5 text-blue-600" />
                  <span>Facebook</span>
                </button>

                {/* WhatsApp Share */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="btn-base bg-surface border border-border text-ink hover:text-emerald-600 hover:border-emerald-300 button-xsm text-xs"
                  aria-label={t.product.shareWhatsApp}
                >
                  <FontAwesomeIcon icon={Icons.whatsapp} className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                {/* Copy Product Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-base bg-surface border border-border text-ink hover:text-quantum hover:border-quantum/40 button-xsm text-xs"
                  aria-label={t.product.copyLink}
                >
                  <FontAwesomeIcon icon={Icons.copy} className="h-3.5 w-3.5 text-muted" />
                  <span>{t.product.copyLink}</span>
                </button>
              </div>
            </div>

            {/* Direct WhatsApp / Messenger Inquiry Action */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDirectWhatsAppChat}
                className="btn-base flex-1 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 button-xsm text-xs font-semibold py-2"
              >
                <FontAwesomeIcon icon={Icons.whatsapp} className="h-4 w-4 text-emerald-600" />
                <span>{language === 'bn' ? 'এই পণ্যটি নিয়ে হোয়াটসঅ্যাপে কথা বলুন' : 'Ask on WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleDirectMessengerChat}
                className="btn-base flex-1 bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 button-xsm text-xs font-semibold py-2"
              >
                <FontAwesomeIcon icon={Icons.messenger} className="h-4 w-4 text-blue-600" />
                <span>{language === 'bn' ? 'মেসেঞ্জারে চ্যাট করুন' : 'Chat on Messenger'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Description, Technical Specifications, Customer Reviews */}
      <div className="mt-16 pt-8 border-t border-border">
        <div className="flex border-b border-border gap-4 sm:gap-8 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`pb-3 title-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'description'
                ? 'border-quantum text-quantum'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.product.description}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`pb-3 title-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'specs'
                ? 'border-quantum text-quantum'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.product.specifications}
          </button>
          <button
            type="button"
            data-testid="reviews-tab-btn"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 title-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-quantum text-quantum'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.product.customerReviews} ({reviews.length})
          </button>
        </div>

        <div className="py-6">
          {activeTab === 'description' && (
            <div className="max-w-3xl">
              <p className="body-2 text-ink leading-relaxed mb-4">
                {productDesc}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-3.5 rounded-xl bg-surface border border-border flex items-start gap-3">
                  <FontAwesomeIcon icon={Icons.shield} className="h-4 w-4 text-quantum mt-0.5" />
                  <div>
                    <h4 className="title-4 font-semibold text-ink">
                      {language === 'bn' ? 'কোয়ালিটি গ্যারান্টি' : 'Quality Guaranteed'}
                    </h4>
                    <p className="caption-4 text-muted">
                      {language === 'bn' ? '১০০% আসল ও পরীক্ষিত পারফরম্যান্স।' : '100% genuine and lab-tested performance.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border flex items-start gap-3">
                  <FontAwesomeIcon icon={Icons.delivery} className="h-4 w-4 text-quantum mt-0.5" />
                  <div>
                    <h4 className="title-4 font-semibold text-ink">
                      {language === 'bn' ? 'দ্রুত হোম ডেলিভারি' : 'Express Delivery'}
                    </h4>
                    <p className="caption-4 text-muted">
                      {language === 'bn' ? 'সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা।' : 'Nationwide Cash on Delivery available.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <tbody>
                  {Object.entries(specifications).map(([key, val], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? 'bg-surface-alt' : 'bg-surface'}>
                      <td className="py-3 px-4 font-semibold text-muted w-1/3 border-b border-border/50">
                        {key}
                      </td>
                      <td className="py-3 px-4 text-ink font-medium border-b border-border/50">
                        {val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-4xl flex flex-col gap-8">
              {/* Review Summary Breakdown Card */}
              <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left Column: Overall Rating */}
                  <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6">
                    <span className="caption-4 font-bold uppercase tracking-wider text-muted mb-1">
                      {language === 'bn' ? 'গড় গ্রাহক রেটিং' : 'Overall Customer Rating'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="heading-2 font-extrabold text-ink">
                        {(reviewStats.totalCount > 0 ? reviewStats.averageRating : product.rating).toFixed(1)}
                      </span>
                      <span className="title-3 text-muted font-bold">/ 5.0</span>
                    </div>

                    <div className="flex text-amber-400 text-base my-2">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const effectiveRating = reviewStats.totalCount > 0 ? reviewStats.averageRating : product.rating;
                        return (
                          <FontAwesomeIcon
                            key={i}
                            icon={Icons.star}
                            className={`h-4 w-4 ${
                              i <= Math.round(effectiveRating) ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>

                    <p className="caption-2 text-muted">
                      {language === 'bn'
                        ? `${reviewStats.totalCount} টি অনুমোদিত গ্রাহক পর্যালোচনার ভিত্তিতে`
                        : `Based on ${reviewStats.totalCount} approved customer review${reviewStats.totalCount === 1 ? '' : 's'}`}
                    </p>

                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 caption-4 font-semibold">
                      <FontAwesomeIcon icon={Icons.shield} className="h-3 w-3 text-emerald-600" />
                      <span>
                        {language === 'bn' ? '১০০% আসল ও পরীক্ষিত রিভিউ' : '100% Genuine & Moderated Reviews'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Rating Distribution Bars (5 to 1) */}
                  <div className="md:col-span-7 flex flex-col gap-2.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviewStats.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                      const percentage = reviewStats.percentages[star as 1 | 2 | 3 | 4 | 5] || 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                          <span className="w-12 font-semibold text-slate-700 whitespace-nowrap">
                            {star} {language === 'bn' ? 'স্টার' : star === 1 ? 'Star' : 'Stars'}
                          </span>
                          <div className="flex-1 h-3 bg-surface-muted rounded-full overflow-hidden border border-border/40">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-14 text-right caption-4 text-muted font-medium tabular-nums">
                            {count} ({percentage}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Controls Toolbar: Sort by + Write Review Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="caption-3 font-semibold text-muted whitespace-nowrap">
                    {language === 'bn' ? 'সাজান:' : 'Sort by:'}
                  </span>
                  <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-2xs">
                    {(
                      [
                        { key: 'newest', labelEn: 'Most Recent', labelBn: 'নতুনতম' },
                        { key: 'highest', labelEn: 'Highest Rating', labelBn: 'সর্বোচ্চ রেটিং' },
                        { key: 'lowest', labelEn: 'Lowest Rating', labelBn: 'সর্বনিম্ন রেটিং' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          setReviewSort(s.key);
                          if (product) {
                            setReviews(reviewService.getApprovedReviews(product.id, s.key));
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          reviewSort === s.key
                            ? 'bg-quantum text-white shadow-2xs'
                            : 'text-slate-600 hover:text-ink hover:bg-surface-muted'
                        }`}
                      >
                        {language === 'bn' ? s.labelBn : s.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="write-review-open-btn"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm font-semibold shadow-xs flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={Icons.plus} className="h-3 w-3" />
                  <span>{t.product.writeReview}</span>
                </button>
              </div>

              {/* Customer Reviews List */}
              {reviews.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-surface-alt flex flex-col items-center justify-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-quantum-soft flex items-center justify-center text-quantum">
                    <FontAwesomeIcon icon={Icons.reviews} className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="title-3 font-bold text-ink">
                      {language === 'bn' ? 'এখনও কোন পর্যালোচিত রিভিউ নেই' : 'No Approved Customer Reviews Yet'}
                    </h4>
                    <p className="caption-2 text-muted mt-1 max-w-md mx-auto">
                      {language === 'bn'
                        ? 'এই গ্যাজেটটি নিয়ে প্রথম রিভিউ দিন এবং অন্যান্য প্রযুক্তিপ্রেমীদের সঠিক সিদ্ধান্ত নিতে সাহায্য করুন।'
                        : 'Be the first to share your real hands-on experience with this accessory to help other buyers.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm font-semibold mt-2"
                  >
                    <FontAwesomeIcon icon={Icons.plus} className="h-3 w-3" />
                    <span>{t.product.writeReview}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reviews.slice(0, reviewPageLimit).map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-3 transition-shadow hover:shadow-sm"
                    >
                      {/* Review Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="title-4 font-bold text-ink">{rev.reviewerName}</span>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1.5 caption-4 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              <FontAwesomeIcon icon={Icons.check} className="h-3 w-3 text-emerald-600" />
                              <span>{language === 'bn' ? 'যাচাইকৃত ক্রেতা' : 'Verified Purchase'}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex text-amber-400 text-xs">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <FontAwesomeIcon
                                key={i}
                                icon={Icons.star}
                                className={`h-3 w-3 ${i <= rev.rating ? 'text-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                          </div>
                          <span className="caption-4 text-muted whitespace-nowrap">
                            {new Date(rev.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Review Title */}
                      {rev.title && (
                        <h5 className="title-4 font-bold text-ink leading-snug">
                          {rev.title}
                        </h5>
                      )}

                      {/* Review Content */}
                      <p className="body-3 text-slate-700 leading-relaxed whitespace-pre-line">
                        {rev.comment}
                      </p>

                      {/* Uploaded Photos Thumbnails */}
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex flex-wrap gap-2.5 pt-2">
                          {rev.images.map((img, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setPreviewReviewImage(img)}
                              className="relative group w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border hover:border-quantum hover:shadow-xs transition-all bg-surface-alt"
                              aria-label={`Preview customer photo ${imgIdx + 1}`}
                            >
                              <img
                                src={img}
                                alt={`Customer upload thumbnail ${imgIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-ink/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                                <FontAwesomeIcon icon={Icons.search} className="h-3.5 w-3.5" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Load More Button */}
                  {reviews.length > reviewPageLimit && (
                    <button
                      type="button"
                      onClick={() => setReviewPageLimit((prev) => prev + 4)}
                      className="btn-base bg-surface border border-border text-slate-700 hover:bg-surface-muted py-2.5 px-6 rounded-xl font-semibold text-xs self-center flex items-center gap-2 shadow-2xs transition-colors mt-2"
                    >
                      <FontAwesomeIcon icon={Icons.chevronDown} className="h-3 w-3" />
                      <span>
                        {language === 'bn' ? 'আরও রিভিউ দেখুন' : 'Load More Reviews'} (
                        {reviews.length - reviewPageLimit} {language === 'bn' ? 'টি বাকি' : 'remaining'})
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      <div className="mt-16 pt-8 border-t border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-5 font-bold text-ink">
            {t.product.relatedProducts}
          </h2>
          <Link
            to={`/category/${categorySlug}`}
            className="text-xs font-semibold text-quantum hover:underline flex items-center gap-1.5"
          >
            <span>{language === 'bn' ? 'এই ক্যাটাগরির সবগুলো দেখুন' : 'View all in category'}</span>
            <FontAwesomeIcon icon={Icons.chevronRight} className="h-2.5 w-2.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {relatedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (One-hand friendly) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border p-3 shadow-float flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="caption-5 text-muted">
            {language === 'bn' ? 'মোট মূল্য' : 'Total Price'}
          </span>
          <span className="title-3 font-bold text-ink">
            ৳{(activePrice * quantity).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Stepper on Mobile */}
          <QuantitySelector
            quantity={quantity}
            max={activeStock}
            onChange={setQuantity}
            disabled={isOutOfStock}
          />

          <button
            type="button"
            data-testid="add-to-cart-mobile-btn"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`btn-base h-11 px-4 button-sm text-white shadow-sm font-semibold whitespace-nowrap ${
              isOutOfStock
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-quantum hover:bg-quantum-hover active:scale-95'
            }`}
          >
            <FontAwesomeIcon icon={Icons.cart} className="h-3.5 w-3.5" />
            <span>{isOutOfStock ? t.product.outOfStock : t.product.addToCart}</span>
          </button>
        </div>
      </div>

      {/* Review Submission Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border shadow-float max-w-lg w-full p-6 sm:p-7 animate-scaleUp my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="title-2 font-bold text-ink">
                  {language === 'bn' ? 'পণ্যটির রিভিউ লিখুন' : 'Write a Product Review'}
                </h3>
                <p className="caption-3 text-muted mt-0.5">
                  {language === 'bn'
                    ? 'আপনার বাস্তব অভিজ্ঞতা শেয়ার করে অন্য ক্রেতাদের সহায়তা করুন'
                    : 'Share your authentic hands-on experience with this accessory'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="text-muted hover:text-ink p-1.5 rounded-xl hover:bg-surface-muted transition-colors"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
              </button>
            </div>

            {/* Error banner if form submission failed */}
            {reviewErrors.form && (
              <div className="mt-4 p-3 rounded-xl bg-error-soft text-error border border-error/20 text-xs font-semibold flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.warning} className="h-4 w-4 flex-shrink-0" />
                <span>{reviewErrors.form}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4 mt-4">
              {/* Full / Display Name (Required) */}
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">
                  {language === 'bn' ? 'আপনার নাম / প্রদর্শনযোগ্য নাম' : 'Your Name / Display Name'}{' '}
                  <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reviewName}
                  onChange={(e) => {
                    setReviewName(e.target.value);
                    if (reviewErrors.name) setReviewErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder={language === 'bn' ? 'উদা: তাহমিদ হাসান' : 'e.g. Alex Johnson'}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-quantum bg-surface ${
                    reviewErrors.name ? 'border-error ring-1 ring-error' : 'border-border'
                  }`}
                />
                {reviewErrors.name && (
                  <p className="caption-4 text-error font-medium mt-1">{reviewErrors.name}</p>
                )}
              </div>

              {/* Star Rating Picker (Required) */}
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">
                  {language === 'bn' ? 'রেটিং বাছাই করুন' : 'Select Rating'}{' '}
                  <span className="text-error">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="flex text-2xl gap-1 text-slate-300"
                    onMouseLeave={() => setReviewRatingHover(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isHighlighted = (reviewRatingHover || reviewRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setReviewRatingHover(star)}
                          className="p-1 transition-transform hover:scale-110 focus:outline-none"
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          <FontAwesomeIcon
                            icon={Icons.star}
                            className={`transition-colors ${isHighlighted ? 'text-amber-400' : 'text-slate-200'}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="caption-3 font-bold text-quantum bg-quantum-soft px-2.5 py-1 rounded-lg">
                    {getRatingLabel(reviewRatingHover || reviewRating)}
                  </span>
                </div>
              </div>

              {/* Review Title (Required) */}
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">
                  {language === 'bn' ? 'রিভিউয়ের শিরোনাম' : 'Review Title / Headline'}{' '}
                  <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reviewTitle}
                  onChange={(e) => {
                    setReviewTitle(e.target.value);
                    if (reviewErrors.title) setReviewErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder={language === 'bn' ? 'উদা: অবিশ্বাস্য দ্রুত চার্জিং ও সেরা বিল্ড কোয়ালিটি' : 'e.g. Exceptional Build Quality & Rapid Charging'}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-quantum bg-surface ${
                    reviewErrors.title ? 'border-error ring-1 ring-error' : 'border-border'
                  }`}
                />
                {reviewErrors.title && (
                  <p className="caption-4 text-error font-medium mt-1">{reviewErrors.title}</p>
                )}
              </div>

              {/* Review Description (Required, min 10 chars) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="caption-3 font-semibold text-ink">
                    {language === 'bn' ? 'বিস্তারিত রিভিউ' : 'Detailed Review'}{' '}
                    <span className="text-error">*</span>
                  </label>
                  <span
                    className={`caption-4 font-semibold tabular-nums ${
                      reviewComment.length >= 10 ? 'text-success' : 'text-muted'
                    }`}
                  >
                    {reviewComment.length} / 10 {language === 'bn' ? 'অক্ষর সর্বনিম্ন' : 'min chars'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => {
                    setReviewComment(e.target.value);
                    if (reviewErrors.comment) setReviewErrors((prev) => ({ ...prev, comment: '' }));
                  }}
                  placeholder={
                    language === 'bn'
                      ? 'পণ্যটির পারফরম্যান্স, হিটিং, স্থায়িত্ব এবং চার্জিং স্পিড নিয়ে আপনার অভিজ্ঞতা লিখুন...'
                      : 'Tell other customers about charging speed, material finish, daily usage, and compatibility...'
                  }
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-quantum bg-surface leading-relaxed ${
                    reviewErrors.comment ? 'border-error ring-1 ring-error' : 'border-border'
                  }`}
                />
                {reviewErrors.comment && (
                  <p className="caption-4 text-error font-medium mt-1">{reviewErrors.comment}</p>
                )}
              </div>

              {/* Order Number (Optional for Verified Badge) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="caption-3 font-semibold text-ink">
                    {language === 'bn' ? 'অর্ডার নম্বর (ঐচ্ছিক)' : 'Order Number (Optional)'}
                  </label>
                  <span className="caption-4 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                    {language === 'bn' ? 'যাচাইকৃত ব্যাজ পাবেন' : 'Unlocks Verified Badge'}
                  </span>
                </div>
                <input
                  type="text"
                  value={reviewOrderNumber}
                  onChange={(e) => setReviewOrderNumber(e.target.value)}
                  placeholder="QT-XXXXXX-XXXX"
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-quantum bg-surface placeholder:text-muted/60"
                />
                <p className="caption-4 text-muted mt-1">
                  {language === 'bn'
                    ? 'আপনার অর্ডারের কোড দিলে স্বয়ংক্রিয়ভাবে "যাচাইকৃত ক্রেতা" ব্যাজ যুক্ত হবে।'
                    : 'Provide your QuantumTech order number to verify purchase automatically.'}
                </p>
              </div>

              {/* Customer Email (Optional, strictly private) */}
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">
                  {language === 'bn' ? 'ইমেইল ঠিকানা (ঐচ্ছিক)' : 'Email Address (Optional)'}
                </label>
                <input
                  type="email"
                  value={reviewEmail}
                  onChange={(e) => {
                    setReviewEmail(e.target.value);
                    if (reviewErrors.email) setReviewErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="yourname@example.com"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-quantum bg-surface placeholder:text-muted/60 ${
                    reviewErrors.email ? 'border-error ring-1 ring-error' : 'border-border'
                  }`}
                />
                {reviewErrors.email && (
                  <p className="caption-4 text-error font-medium mt-1">{reviewErrors.email}</p>
                )}
                <div className="flex items-center gap-1.5 caption-4 text-muted mt-1">
                  <FontAwesomeIcon icon={Icons.shield} className="h-3 w-3 text-quantum" />
                  <span>
                    {language === 'bn'
                      ? 'গোপনীয়তার নিশ্চয়তা: আপনার ইমেইল কখনো ওয়েবসাইটে প্রকাশ্যে প্রদর্শিত হবে না।'
                      : 'Strict Privacy: Your email will NEVER be displayed publicly on the website.'}
                  </span>
                </div>
              </div>

              {/* Customer Photos Upload (Optional, max 4) */}
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">
                  {language === 'bn' ? 'পণ্যের বাস্তব ছবি (ঐচ্ছিক, সর্বোচ্চ ৪টি)' : 'Product Photos (Optional, Max 4)'}
                </label>

                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {reviewImages.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border border-dashed border-border bg-surface-alt hover:bg-surface-muted hover:border-quantum text-slate-700 transition-colors flex items-center justify-center gap-2 caption-3 font-semibold cursor-pointer"
                  >
                    <FontAwesomeIcon icon={Icons.camera} className="h-4 w-4 text-quantum" />
                    <span>
                      {language === 'bn'
                        ? 'ছবি সিলেক্ট করুন (JPG, PNG, WEBP - সর্বোচ্চ ৫MB)'
                        : 'Choose photos to upload (JPG, PNG, WEBP - Max 5MB)'}
                    </span>
                  </button>
                )}

                {/* Uploaded Images Preview Thumbnails */}
                {reviewImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2.5 mt-3">
                    {reviewImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface shadow-2xs group"
                      >
                        <img
                          src={img}
                          alt={`Uploaded preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeReviewImage(idx)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-error text-white flex items-center justify-center shadow-sm hover:bg-error-dark transition-all"
                          title="Remove photo"
                        >
                          <FontAwesomeIcon icon={Icons.close} className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Moderation Notice Alert */}
              <div className="p-3 rounded-xl bg-quantum-soft/50 border border-quantum/20 text-xs text-slate-700 flex items-start gap-2.5 mt-1">
                <FontAwesomeIcon icon={Icons.shield} className="h-4 w-4 text-quantum mt-0.5 flex-shrink-0" />
                <p className="caption-3 leading-relaxed">
                  {language === 'bn'
                    ? 'নোট: স্প্যাম প্রতিরোধ ও সত্যতা নিশ্চিত করতে প্রতিটি রিভিউ অ্যাডমিন টিম দ্বারা যাচাই-বাছাইয়ের পর ওয়েবসাইটে প্রকাশিত হবে।'
                    : 'Moderation Notice: To preserve community integrity, submitted reviews are moderated before public storefront publication.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="btn-base bg-surface-alt border border-border text-slate-700 hover:bg-surface-muted button-sm font-semibold"
                >
                  {t.admin.productForm.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm font-semibold shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmittingReview && <FontAwesomeIcon icon={Icons.spinner} className="animate-spin h-3.5 w-3.5" />}
                  <span>{language === 'bn' ? 'রিভিউ জমা দিন' : 'Submit Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {previewReviewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewReviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden shadow-2xl p-2 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewReviewImage(null)}
              className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-ink/70 hover:bg-ink text-white flex items-center justify-center transition-all shadow-md"
              aria-label="Close image preview"
            >
              <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
            </button>
            <img
              src={previewReviewImage}
              alt="High resolution customer review capture"
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
