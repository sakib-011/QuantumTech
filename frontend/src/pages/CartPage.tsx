import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { QuantitySelector } from '../components/QuantitySelector';
import { EmptyState } from '../components/EmptyState';
import { PriceDisplay } from '../components/PriceDisplay';
import { Icons } from '../utilities/icons';
import { formatCurrency } from '../utilities/currency';
import { productService } from '../services/productService';

export const CartPage: React.FC = () => {
  const {
    items,
    totalCount,
    subtotal,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: t.cart.title || 'Your Cart' },
        ]}
      />

      <div className="my-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">
            {t.cart.title}
          </h1>
          <p className="body-4 text-muted mt-0.5">
            {totalCount}{' '}
            {language === 'bn' ? 'টি আইটেম আপনার কার্টে রয়েছে' : 'items currently in your cart'}
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-muted hover:text-error hover:underline flex items-center gap-1.5 self-start sm:self-auto"
            aria-label="Empty entire cart"
          >
            <FontAwesomeIcon icon={Icons.trash} className="h-3.5 w-3.5" />
            <span>{language === 'bn' ? 'সম্পূর্ণ কার্ট খালি করুন' : 'Clear entire cart'}</span>
          </button>
        )}
      </div>

      {/* Cart Content: Empty State or Cart Items Grid */}
      {items.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-border p-8 sm:p-14 text-center shadow-sm">
          <EmptyState
            icon={Icons.cart}
            title={t.cart.emptyTitle}
            description={t.cart.emptyDesc}
            actionText={t.cart.startShopping}
            onAction={() => navigate('/shop')}
          />

          {/* Quick Categories to Explore */}
          <div className="mt-10 pt-8 border-t border-border max-w-3xl mx-auto text-left">
            <h3 className="title-3 font-bold text-ink mb-3 text-center">
              {language === 'bn' ? 'প্রয়োজনীয় ক্যাটাগরি ঘুরে দেখুন' : 'Explore Popular Categories'}
            </h3>
            <div className="flex flex-wrap justify-center gap-2.5">
              {productService.getCategories().map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="btn-base px-3.5 py-2 rounded-xl bg-surface-alt border border-border text-xs font-semibold text-ink hover:border-quantum hover:text-quantum transition-colors"
                >
                  {language === 'bn' ? cat.nameBn : cat.nameEn}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 divide-y divide-border">
                {items.map((item) => {
                  const maxStock = item.selectedVariant
                    ? item.selectedVariant.stock
                    : item.product.stock;
                  const itemTitle =
                    language === 'bn' ? item.product.nameBn : item.product.name;
                  const itemCategory =
                    language === 'bn'
                      ? item.product.categoryNameBn
                      : item.product.categoryName;
                  const variantLabel = item.selectedVariant
                    ? language === 'bn'
                      ? item.selectedVariant.valueBn || item.selectedVariant.value
                      : item.selectedVariant.value
                    : null;
                  const itemImage =
                    item.selectedVariant?.image ||
                    item.product.images[0] ||
                    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80';

                  return (
                    <div
                      key={item.id}
                      className="py-4 sm:py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      {/* Product Thumbnail & Details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <Link
                          to={`/product/${item.product.slug}`}
                          className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-xl overflow-hidden bg-surface-alt border border-border"
                          aria-label={`View ${itemTitle}`}
                        >
                          <img
                            src={itemImage}
                            alt={itemTitle}
                            className="h-full w-full object-cover"
                          />
                        </Link>

                        <div className="flex flex-col min-w-0">
                          <span className="caption-5 text-muted truncate">
                            {itemCategory}
                          </span>

                          <Link
                            to={`/product/${item.product.slug}`}
                            className="title-3 font-semibold text-ink hover:text-quantum transition-colors line-clamp-2 mt-0.5"
                          >
                            {itemTitle}
                          </Link>

                          {variantLabel && (
                            <span className="caption-4 text-quantum font-medium mt-1 inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-quantum" />
                              <span>{variantLabel}</span>
                            </span>
                          )}

                          <div className="sm:hidden mt-2">
                            <PriceDisplay price={item.unitPrice} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* Stepper, Line Total & Remove Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        {/* Hidden unit price on mobile, visible on desktop */}
                        <div className="hidden sm:block text-right min-w-[80px]">
                          <span className="caption-4 text-muted block">Unit Price</span>
                          <span className="title-4 text-ink font-semibold">
                            {formatCurrency(item.unitPrice, language)}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center">
                          <QuantitySelector
                            quantity={item.quantity}
                            max={maxStock}
                            onChange={(newQty) => updateQuantity(item.id, newQty)}
                          />
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[90px]">
                          <span className="caption-5 text-muted sm:hidden block">Subtotal</span>
                          <span className="title-3 font-bold text-ink">
                            {formatCurrency(item.lineTotal, language)}
                          </span>
                        </div>

                        {/* Remove Action */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-error hover:bg-error-soft active:scale-90 transition-colors"
                          title={t.cart.removeItem}
                          aria-label={`Remove ${itemTitle} from cart`}
                        >
                          <FontAwesomeIcon icon={Icons.trash} className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back to Shop Link */}
            <div className="flex items-center justify-between pt-2">
              <Link
                to="/shop"
                className="text-xs font-semibold text-quantum hover:underline flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={Icons.chevronLeft} className="h-2.5 w-2.5" />
                <span>{t.cart.continueShopping}</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Cart Summary Sidebar */}
          <div className="lg:col-span-4 sticky top-24 flex flex-col gap-4">
            <div className="rounded-2xl bg-surface border border-border p-6 shadow-sm">
              <h2 className="title-2 font-bold text-ink mb-4 pb-3 border-b border-border">
                {language === 'bn' ? 'অর্ডার সারাংশ' : 'Order Summary'}
              </h2>

              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t.cart.subtotal}</span>
                  <span className="font-bold text-ink">
                    {formatCurrency(subtotal, language)}
                  </span>
                </div>

                <div className="flex items-start justify-between text-xs text-muted">
                  <span>{language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span>
                  <span className="text-right font-medium text-ink">
                    {language === 'bn'
                      ? 'চেকআউটে নির্ধারিত হবে'
                      : 'Calculated at checkout'}
                  </span>
                </div>

                <div className="bg-surface-alt p-2.5 rounded-lg border border-border text-xs text-muted flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.truck} className="h-3 w-3 text-quantum" />
                  <span>
                    {language === 'bn'
                      ? 'ঢাকার ভিতরে ৳৭০ • ঢাকার বাইরে ৳১৩০'
                      : 'Inside Dhaka ৳70 • Outside Dhaka ৳130'}
                  </span>
                </div>
              </div>

              {/* Total Payable Estimate */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <span className="title-3 font-bold text-ink block">
                    {language === 'bn' ? 'আনুমানিক সর্বমোট' : 'Estimated Total'}
                  </span>
                  <span className="caption-5 text-muted">
                    {language === 'bn' ? 'ভ্যাট সহ অন্তর্ভুক্ত' : 'Inclusive of all taxes'}
                  </span>
                </div>
                <span className="heading-4 font-bold text-quantum">
                  {formatCurrency(subtotal, language)}
                </span>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                className="btn-base w-full h-12 bg-quantum text-white hover:bg-quantum-hover active:scale-98 button-md font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={Icons.card} className="h-4 w-4" />
                <span>{t.cart.checkout}</span>
              </button>

              {/* Trust Badges */}
              <div className="mt-5 pt-4 border-t border-border space-y-2 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.cod} className="h-3.5 w-3.5 text-quantum" />
                  <span>{t.trust.codTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.returns} className="h-3.5 w-3.5 text-quantum" />
                  <span>{t.trust.returnsTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.shield} className="h-3.5 w-3.5 text-quantum" />
                  <span>{t.trust.verifiedTitle}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Checkout Bar (Easy one-hand operation) */}
      {items.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border p-3 shadow-float flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="caption-5 text-muted">{t.cart.subtotal}</span>
            <span className="title-3 font-bold text-ink">
              {formatCurrency(subtotal, language)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            className="btn-base flex-1 h-12 bg-quantum text-white hover:bg-quantum-hover active:scale-95 button-md font-semibold shadow-sm flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={Icons.card} className="h-4 w-4" />
            <span>{t.cart.checkout}</span>
          </button>
        </div>
      )}
    </div>
  );
};
