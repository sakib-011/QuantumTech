import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { QuantitySelector } from './QuantitySelector';
import { PriceDisplay } from './PriceDisplay';
import { EmptyState } from './EmptyState';
import { Icons } from '../utilities/icons';
import { formatCurrency } from '../utilities/currency';

export const CartDrawer: React.FC = () => {
  const {
    items,
    totalCount,
    subtotal,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleShop = () => {
    setIsCartOpen(false);
    navigate('/shop');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-surface shadow-float flex flex-col justify-between border-l border-border animate-slideLeft">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.cart} className="text-quantum h-5 w-5" />
              <h2 id="cart-drawer-title" className="title-2 text-ink font-semibold">
                {t.cart.title}
              </h2>
              <span className="caption-3 px-2 py-0.5 rounded-full bg-quantum-soft text-quantum font-semibold">
                {totalCount}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink transition-colors"
              aria-label="Close cart"
            >
              <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
            </button>
          </div>

          {/* Body: Items List or Empty State */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <EmptyState
                icon={Icons.cart}
                title={t.cart.emptyTitle}
                description={t.cart.emptyDesc}
                actionText={t.cart.startShopping}
                onAction={handleShop}
              />
            ) : (
              <div className="flex flex-col gap-4 divide-y divide-border">
                {items.map((item) => {
                  const title = language === 'bn' ? item.product.nameBn : item.product.name;
                  const variantText = item.selectedVariant
                    ? language === 'bn'
                      ? item.selectedVariant.valueBn || item.selectedVariant.value
                      : item.selectedVariant.value
                    : null;
                  const maxStock = item.selectedVariant ? item.selectedVariant.stock : item.product.stock;

                  return (
                    <div key={item.id} className="pt-4 first:pt-0 flex gap-4">
                      {/* Product Thumbnail */}
                      <img
                        src={item.product.images[0]}
                        alt={title}
                        className="h-20 w-20 flex-shrink-0 rounded-lg object-cover bg-surface-alt border border-border"
                      />

                      {/* Item Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="title-4 text-ink font-semibold line-clamp-1">
                              {title}
                            </h3>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="text-muted hover:text-error transition-colors p-1"
                              aria-label={t.cart.removeItem}
                            >
                              <FontAwesomeIcon icon={Icons.trash} className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {variantText && (
                            <span className="caption-4 text-muted block mt-0.5">
                              {variantText}
                            </span>
                          )}

                          <div className="mt-1">
                            <PriceDisplay price={item.unitPrice} size="sm" />
                          </div>
                        </div>

                        {/* Stepper & Line Total */}
                        <div className="flex items-center justify-between pt-2">
                          <QuantitySelector
                            quantity={item.quantity}
                            max={maxStock}
                            onChange={(newQty) => updateQuantity(item.id, newQty)}
                          />
                          <span className="title-4 text-ink font-semibold">
                            {formatCurrency(item.lineTotal, language)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer: Subtotal and Checkout Button */}
          {items.length > 0 && (
            <div className="border-t border-border p-6 bg-surface-alt">
              <div className="flex items-center justify-between mb-2">
                <span className="body-4 text-muted">{t.cart.subtotal}</span>
                <span className="heading-5 text-ink font-semibold">
                  {formatCurrency(subtotal, language)}
                </span>
              </div>

              <p className="caption-4 text-muted mb-4">
                {t.cart.deliveryNotice}
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="btn-base w-full bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm h-12"
                >
                  <FontAwesomeIcon icon={Icons.card} className="h-4 w-4" />
                  <span>{t.cart.checkout}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/cart');
                  }}
                  className="btn-base w-full bg-surface border border-border text-ink hover:bg-surface-muted hover:border-quantum/40 hover:text-quantum button-sm"
                >
                  <FontAwesomeIcon icon={Icons.cart} className="h-3.5 w-3.5" />
                  <span>{language === 'bn' ? 'সম্পূর্ণ কার্ট পেজ দেখুন' : 'View Full Cart Page'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShop}
                  className="btn-base w-full bg-surface-alt border border-border text-muted hover:text-ink hover:bg-surface-muted button-sm"
                >
                  {t.cart.continueShopping}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
