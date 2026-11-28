import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { promotionService } from '../services/promotionService';
import { productService } from '../services/productService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { formatCurrency } from '../utilities/currency';
import { PromotionalPopup, Product } from '../types';

export const PromotionalPopupContainer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { language } = useLanguage();

  const [popup, setPopup] = useState<PromotionalPopup | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  useEffect(() => {
    // Reset state on route change
    setIsOpen(false);
    setPopup(null);

    const pathname = location.pathname;
    // Strict Safety: Never show popups on checkout, order confirmation, or admin
    if (
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/order-confirmation') ||
      pathname.startsWith('/admin')
    ) {
      return;
    }

    const isMobile = window.innerWidth < 768;
    const isReturning = Boolean(localStorage.getItem('qt_visitor_returned'));
    localStorage.setItem('qt_visitor_returned', 'true');

    const eligible = promotionService.getEligiblePopup(pathname, isMobile, isReturning);
    if (!eligible) return;

    setPopup(eligible);

    // If popup features a specific product, fetch it
    if (eligible.productId) {
      const p = productService.getProductById(eligible.productId);
      setProduct(p || null);
    }

    let timer: NodeJS.Timeout;

    // Trigger handling
    if (eligible.triggerType === 'immediate') {
      const delay = Math.max(100, (eligible.delaySeconds || 0) * 1000);
      timer = setTimeout(() => {
        setIsOpen(true);
        promotionService.trackEvent('popup_impression', {
          popupId: eligible.id,
          campaignId: eligible.campaignId,
        });
      }, delay);
    } else if (eligible.triggerType === 'delay') {
      const delay = Math.max(500, (eligible.delaySeconds || 2) * 1000);
      timer = setTimeout(() => {
        setIsOpen(true);
        promotionService.trackEvent('popup_impression', {
          popupId: eligible.id,
          campaignId: eligible.campaignId,
        });
      }, delay);
    } else if (eligible.triggerType === 'scroll') {
      const targetPercent = eligible.scrollPercentage || 40;
      const handleScroll = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;
        const currentPercent = (scrollTop / docHeight) * 100;

        if (currentPercent >= targetPercent) {
          setIsOpen(true);
          promotionService.trackEvent('popup_impression', {
            popupId: eligible.id,
            campaignId: eligible.campaignId,
          });
          window.removeEventListener('scroll', handleScroll);
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (timer) clearTimeout(timer);
      };
    } else if (
      eligible.triggerType === 'product_page' &&
      pathname.startsWith('/product/')
    ) {
      timer = setTimeout(() => {
        setIsOpen(true);
        promotionService.trackEvent('popup_impression', {
          popupId: eligible.id,
          campaignId: eligible.campaignId,
        });
      }, Math.max(500, (eligible.delaySeconds || 1) * 1000));
    } else if (eligible.triggerType === 'cart_page' && pathname === '/cart') {
      timer = setTimeout(() => {
        setIsOpen(true);
        promotionService.trackEvent('popup_impression', {
          popupId: eligible.id,
          campaignId: eligible.campaignId,
        });
      }, Math.max(500, (eligible.delaySeconds || 1) * 1000));
    } else {
      // Default fallback delay
      timer = setTimeout(() => {
        setIsOpen(true);
        promotionService.trackEvent('popup_impression', {
          popupId: eligible.id,
          campaignId: eligible.campaignId,
        });
      }, 2500);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [location.pathname]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, popup]);

  if (!isOpen || !popup) return null;

  const handleClose = () => {
    if (popup) {
      promotionService.recordPopupDismissal(popup.id, popup.frequency);
      promotionService.trackEvent('popup_close', {
        popupId: popup.id,
        campaignId: popup.campaignId,
      });
    }
    setIsOpen(false);
  };

  const handleCtaClick = (destination: string) => {
    if (popup) {
      promotionService.trackEvent('popup_click', {
        popupId: popup.id,
        campaignId: popup.campaignId,
      });
      promotionService.recordPopupDismissal(popup.id, popup.frequency);
    }
    setIsOpen(false);
    navigate(destination);
  };

  const handleDirectAddProduct = () => {
    if (product) {
      const defVariant = product.variants && product.variants.length > 0 ? product.variants[0] : undefined;
      addToCart(product, defVariant, 1);
      if (popup) {
        promotionService.trackEvent('popup_click', {
          popupId: popup.id,
          productId: product.id,
        });
        promotionService.recordPopupDismissal(popup.id, popup.frequency);
      }
      setIsOpen(false);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setNewsletterSubmitted(true);
    showToast('Promo code unlocked: WELCOME10! Use at checkout for 10% off.', 'success');
    promotionService.trackEvent('popup_click', {
      popupId: popup.id,
      couponCode: 'WELCOME10',
    });
  };

  // Safe styling helpers
  const bgStyle = { backgroundColor: popup.backgroundColor || '#FFFFFF' };
  const textStyle = { color: popup.textColor || '#0F172A' };
  const btnStyle = { backgroundColor: popup.buttonColor || '#2563EB' };

  return (
    <div
      data-testid="promotional-popup"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={popup.heading}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[420px] sm:max-w-md max-h-[92vh] overflow-y-auto rounded-2xl overflow-hidden shadow-2xl border border-border/80 animate-scaleUp transition-all"
        style={bgStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accessible Close Button */}
        <button
          type="button"
          data-testid="popup-close-btn"
          onClick={handleClose}
          className="absolute top-2.5 right-2.5 z-30 h-8 w-8 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-md focus:outline-none border border-white/20"
          aria-label="Close promotion popup"
        >
          <FontAwesomeIcon icon={Icons.close} className="h-3.5 w-3.5" />
        </button>

        {/* 1. LAYOUT: IMAGE-ONLY */}
        {popup.layoutType === 'image_only' && (
          <div className="relative group cursor-pointer" onClick={() => handleCtaClick(popup.buttonLink)}>
            <img
              src={popup.imageUrl}
              alt={popup.heading}
              className="w-full h-auto max-h-[80vh] object-cover"
            />
            {popup.buttonText && (
              <div className="p-4 bg-surface flex justify-center border-t border-border">
                <button
                  type="button"
                  style={btnStyle}
                  className="btn-base text-white button-md px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:opacity-95"
                >
                  {popup.buttonText}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. LAYOUT: IMAGE WITH HEADING & DESCRIPTION */}
        {popup.layoutType === 'image_text' && (
          <div className="flex flex-col">
            <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-slate-900">
              <img
                src={popup.imageUrl}
                alt={popup.heading}
                className="w-full h-full object-cover"
              />
              {popup.badgeText && (
                <div className="absolute top-2.5 left-2.5">
                  <span className="caption-4 px-2 py-0.5 rounded bg-quantum text-white font-bold shadow-sm uppercase tracking-wider">
                    {popup.badgeText}
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-5 flex flex-col gap-2" style={textStyle}>
              {popup.subtitle && (
                <span className="caption-4 font-bold uppercase tracking-wider text-quantum">
                  {popup.subtitle}
                </span>
              )}
              <h3 className="heading-4 sm:title-2 font-bold leading-tight">{popup.heading}</h3>
              <p className="caption-2 sm:caption-1 opacity-90 leading-relaxed">{popup.description}</p>
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleCtaClick(popup.buttonLink)}
                  style={btnStyle}
                  className="btn-base text-white button-sm px-5 py-2 rounded-xl font-semibold shadow-sm hover:opacity-95"
                >
                  {popup.buttonText}
                </button>
                {popup.secondaryButtonText && (
                  <button
                    type="button"
                    onClick={() => handleCtaClick(popup.secondaryButtonLink || '/shop')}
                    className="btn-base bg-surface-alt border border-border text-slate-700 button-xsm text-xs font-semibold hover:bg-slate-200 px-3 py-2 rounded-xl"
                  >
                    {popup.secondaryButtonText}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. LAYOUT: SIDE-BY-SIDE */}
        {popup.layoutType === 'side_by_side' && (
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
            <div
              className={`md:col-span-5 relative aspect-square md:aspect-auto overflow-hidden bg-slate-900 ${
                popup.imagePosition === 'right' ? 'md:order-2' : 'md:order-1'
              }`}
            >
              <img
                src={popup.imageUrl}
                alt={popup.heading}
                className="w-full h-full object-cover"
              />
              {popup.badgeText && (
                <span className="absolute top-2.5 left-2.5 caption-4 px-2 py-0.5 rounded bg-quantum text-white font-bold shadow-sm uppercase">
                  {popup.badgeText}
                </span>
              )}
            </div>
            <div
              className={`md:col-span-7 p-4 sm:p-5 flex flex-col justify-center gap-2.5 ${
                popup.imagePosition === 'right' ? 'md:order-1' : 'md:order-2'
              }`}
              style={textStyle}
            >
              {popup.subtitle && (
                <span className="caption-4 font-bold uppercase tracking-wider text-quantum">
                  {popup.subtitle}
                </span>
              )}
              <h3 className="heading-4 sm:title-2 font-bold leading-tight">{popup.heading}</h3>
              <p className="caption-2 sm:caption-1 opacity-90 leading-relaxed">{popup.description}</p>
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={() => handleCtaClick(popup.buttonLink)}
                  style={btnStyle}
                  className="btn-base text-white button-sm px-5 py-2 rounded-xl font-semibold shadow-sm hover:opacity-95 w-full sm:w-auto"
                >
                  {popup.buttonText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. LAYOUT: FULL PROMOTIONAL OFFER */}
        {popup.layoutType === 'full_offer' && (
          <div className="p-4 sm:p-6 flex flex-col items-center text-center gap-2.5" style={textStyle}>
            {popup.badgeText && (
              <span className="caption-4 px-2.5 py-0.5 rounded-full bg-quantum text-white font-bold uppercase tracking-wider shadow-sm">
                {popup.badgeText}
              </span>
            )}
            <h3 className="heading-4 sm:heading-3 font-bold leading-tight max-w-sm">{popup.heading}</h3>
            {popup.subtitle && (
              <p className="caption-1 font-semibold text-quantum">{popup.subtitle}</p>
            )}
            {popup.imageUrl && (
              <div className="w-full max-w-xs h-28 sm:h-36 rounded-xl overflow-hidden border border-border shadow-xs my-0.5">
                <img src={popup.imageUrl} alt={popup.heading} className="w-full h-full object-cover" />
              </div>
            )}
            <p className="caption-2 sm:caption-1 opacity-90 max-w-sm leading-relaxed">{popup.description}</p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto pt-1.5">
              <button
                type="button"
                onClick={() => handleCtaClick(popup.buttonLink)}
                style={btnStyle}
                className="btn-base text-white button-sm sm:button-md px-6 py-2.5 rounded-xl font-bold shadow-sm hover:opacity-95"
              >
                {popup.buttonText}
              </button>
            </div>
          </div>
        )}

        {/* 5. LAYOUT: FESTIVAL-THEMED */}
        {popup.layoutType === 'festival' && (
          <div className="relative overflow-hidden p-4 sm:p-5 flex flex-col gap-2.5 text-white bg-slate-900 border border-slate-700">
            {/* Festive Glow Accent */}
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-quantum/30 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.gift} className="h-4 w-4 text-amber-400" />
              <span className="caption-4 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 uppercase tracking-wider">
                {popup.badgeText || 'FESTIVAL SPECIAL'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 z-10">
              <h3 className="title-2 sm:heading-4 font-bold text-white leading-tight">{popup.heading}</h3>
              {popup.subtitle && <p className="caption-3 text-quantum-soft font-semibold">{popup.subtitle}</p>}
            </div>

            {popup.imageUrl && (
              <div className="relative h-28 sm:h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-sm">
                <img src={popup.imageUrl} alt={popup.heading} className="w-full h-full object-cover" />
              </div>
            )}

            <p className="caption-3 sm:caption-2 text-slate-300 leading-normal z-10">{popup.description}</p>

            {/* Quick 1-click Promo Code Snippet */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.ticket} className="h-3.5 w-3.5 text-quantum" />
                <span className="caption-4 text-slate-300 font-medium">Use Promo Code:</span>
                <span className="caption-1 font-mono font-bold text-amber-400">EID20</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('EID20');
                  showToast('Coupon code EID20 copied to clipboard!', 'success');
                }}
                className="btn-base bg-slate-700 hover:bg-slate-600 text-white button-xsm text-xs font-semibold px-2 py-1 rounded-md"
              >
                <FontAwesomeIcon icon={Icons.copy} className="h-3 w-3 mr-1" />
                <span>Copy</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 z-10">
              <button
                type="button"
                onClick={() => handleCtaClick(popup.buttonLink)}
                className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm px-5 py-2 rounded-xl font-bold shadow-sm w-full sm:w-auto"
              >
                {popup.buttonText}
              </button>
              {popup.secondaryButtonText && (
                <button
                  type="button"
                  onClick={() => handleCtaClick(popup.secondaryButtonLink || '/shop')}
                  className="btn-base bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 button-sm px-4 py-2 font-semibold w-full sm:w-auto"
                >
                  {popup.secondaryButtonText}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6. LAYOUT: PRODUCT-SPECIFIC DISCOUNT */}
        {popup.layoutType === 'product_discount' && (
          <div className="p-6 sm:p-7 flex flex-col gap-4" style={textStyle}>
            <div className="flex items-center justify-between">
              <span className="caption-3 px-2.5 py-0.5 rounded bg-error text-white font-bold uppercase tracking-wider">
                {popup.badgeText || 'SPECIAL PRICE DEAL'}
              </span>
              <span className="caption-4 text-muted font-medium">Valid While Stock Lasts</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden border border-border bg-surface-alt p-1">
                <img
                  src={product?.images[0] || popup.imageUrl}
                  alt={product?.name || popup.heading}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <h4 className="title-2 font-bold leading-tight">{product ? (language === 'bn' ? product.nameBn : product.name) : popup.heading}</h4>
                <p className="caption-3 text-muted line-clamp-2">{popup.description}</p>
                {product && (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="heading-5 font-bold text-quantum">{formatCurrency(product.price, language)}</span>
                    {product.oldPrice && product.oldPrice > product.price && (
                      <span className="caption-3 text-muted line-through">{formatCurrency(product.oldPrice, language)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border">
              {product ? (
                <button
                  type="button"
                  onClick={handleDirectAddProduct}
                  style={btnStyle}
                  className="btn-base flex-1 text-white button-md py-2.5 rounded-xl font-bold shadow-sm hover:opacity-95 flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={Icons.cart} className="h-4 w-4" />
                  <span>Add to Cart Now</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCtaClick(popup.buttonLink)}
                  style={btnStyle}
                  className="btn-base flex-1 text-white button-md py-2.5 rounded-xl font-bold shadow-sm hover:opacity-95"
                >
                  {popup.buttonText}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCtaClick(popup.buttonLink)}
                className="btn-base bg-surface-alt border border-border text-slate-700 button-sm font-semibold hover:bg-slate-200 px-4"
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* 7. LAYOUT: NEWSLETTER / SUBSCRIPTION */}
        {popup.layoutType === 'newsletter' && (
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch" style={bgStyle}>
            <div className="md:col-span-5 relative aspect-square md:aspect-auto overflow-hidden bg-slate-900">
              <img src={popup.imageUrl} alt={popup.heading} className="w-full h-full object-cover" />
              {popup.badgeText && (
                <span className="absolute top-3 left-3 caption-3 px-2 py-0.5 rounded bg-emerald-600 text-white font-bold uppercase">
                  {popup.badgeText}
                </span>
              )}
            </div>
            <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-center gap-3" style={textStyle}>
              <span className="caption-4 font-bold uppercase tracking-wider text-emerald-500">
                {popup.subtitle || 'EXCLUSIVE ACCESS'}
              </span>
              <h3 className="heading-4 font-bold leading-tight">{popup.heading}</h3>
              <p className="body-4 opacity-90 leading-relaxed">{popup.description}</p>

              {newsletterSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <FontAwesomeIcon icon={Icons.check} className="text-emerald-600" />
                    <span>Welcome Promo Unlocked!</span>
                  </div>
                  <p className="caption-4 text-emerald-800">
                    Use coupon code <strong className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-emerald-300">WELCOME10</strong> at checkout for 10% discount.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCtaClick(popup.buttonLink)}
                    className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 button-sm font-semibold mt-2"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2.5 mt-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-quantum"
                  />
                  <button
                    type="submit"
                    style={btnStyle}
                    className="btn-base text-white button-md py-2.5 rounded-xl font-bold shadow-sm hover:opacity-95"
                  >
                    {popup.buttonText || 'Subscribe & Unlock'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 8. LAYOUT: CUSTOM */}
        {popup.layoutType === 'custom' && (
          <div className="p-6 sm:p-8 flex flex-col gap-4" style={{ ...textStyle, textAlign: popup.textAlignment }}>
            {popup.badgeText && (
              <span className="caption-3 px-3 py-1 rounded bg-quantum text-white font-bold uppercase inline-block self-start">
                {popup.badgeText}
              </span>
            )}
            <h3 className="heading-3 font-bold leading-tight">{popup.heading}</h3>
            {popup.subtitle && <p className="title-3 font-semibold text-quantum">{popup.subtitle}</p>}
            {popup.imageUrl && (
              <div className="w-full aspect-video rounded-xl overflow-hidden border border-border shadow-xs">
                <img src={popup.imageUrl} alt={popup.heading} className="w-full h-full object-cover" />
              </div>
            )}
            <p className="body-4 opacity-90 leading-relaxed">{popup.description}</p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCtaClick(popup.buttonLink)}
                style={btnStyle}
                className="btn-base text-white button-md px-6 py-2.5 rounded-xl font-bold shadow-sm hover:opacity-95"
              >
                {popup.buttonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
