import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { orderService } from '../services/orderService';
import { settingsService } from '../services/settingsService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber } from '../utilities/currency';
import { Icons } from '../utilities/icons';
import { Breadcrumb } from '../components/Breadcrumb';

export const OrderConfirmedPage: React.FC = () => {
  const { id, orderNumber: paramNum } = useParams<{ id?: string; orderNumber?: string }>();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState(() => settingsService.getSettings());

  const lookupKey = id || paramNum || '';
  const order = orderService.getOrderByNumber(lookupKey) || orderService.getOrderById(lookupKey);

  const displayOrderNumber = order ? order.orderNumber : lookupKey;

  const handleCopyOrderNumber = () => {
    if (displayOrderNumber) {
      navigator.clipboard.writeText(displayOrderNumber);
      setCopied(true);
      showToast(
        language === 'bn' ? 'অর্ডার নম্বর কপি করা হয়েছে!' : 'Order number copied to clipboard!',
        'success'
      );
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine explicit payment status per specifications
  const isCOD = order ? order.paymentMethod === 'COD' : true;
  const paymentStatusLabel = isCOD
    ? language === 'bn'
      ? 'পণ্য পাওয়ার পর মূল্য পরিশোধ (Pending collection)'
      : 'Pending collection'
    : language === 'bn'
    ? 'ভেরিফিকেশন প্রক্রিয়াধীন (Verification pending)'
    : 'Verification pending';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: t.checkout.title || 'Checkout', href: '/checkout' },
          { label: language === 'bn' ? 'অর্ডার নিশ্চিতকরণ' : 'Order Confirmation' },
        ]}
      />

      <div className="bg-surface rounded-2xl border border-border p-6 sm:p-10 shadow-sm text-center flex flex-col items-center mt-6">
        {/* Professional Confirmation Illustration */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-success-soft flex items-center justify-center text-success border-4 border-success/15 shadow-sm">
            <FontAwesomeIcon icon={Icons.circleCheck} className="h-12 w-12" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-quantum text-white flex items-center justify-center shadow-sm">
            <FontAwesomeIcon icon={Icons.shield} className="h-4 w-4" />
          </div>
        </div>

        {/* Confirmation Headings */}
        <h1 className="heading-4 sm:heading-3 font-bold text-ink mb-2">
          {t.orderConfirmed.title}
        </h1>
        <p className="body-3 text-muted mb-8 max-w-lg leading-relaxed">
          {t.orderConfirmed.subtitle}
        </p>

        {/* Order Number Box with Copy Action */}
        <div className="w-full p-4 sm:p-5 rounded-2xl bg-surface-alt border border-border flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="text-center sm:text-left">
            <span className="caption-4 text-muted block font-semibold uppercase tracking-wider">
              {t.orderConfirmed.orderNumber}
            </span>
            <span className="heading-5 sm:heading-4 font-mono font-bold text-quantum tracking-wider mt-0.5 block">
              {displayOrderNumber}
            </span>
          </div>

          <button
            type="button"
            data-testid="copy-order-btn"
            onClick={handleCopyOrderNumber}
            className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted hover:border-quantum/40 hover:text-quantum button-sm px-4 shadow-sm"
          >
            <FontAwesomeIcon
              icon={copied ? Icons.check : Icons.copy}
              className={`h-3.5 w-3.5 ${copied ? 'text-success' : 'text-quantum'}`}
            />
            <span>{copied ? t.orderConfirmed.copied : t.orderConfirmed.copyOrderNumber}</span>
          </button>
        </div>

        {/* Ordered Products Breakdown */}
        {order && order.items && order.items.length > 0 && (
          <div className="w-full text-left rounded-2xl border border-border overflow-hidden mb-8 shadow-sm">
            <div className="p-4 bg-surface-alt border-b border-border flex items-center justify-between">
              <h3 className="title-3 font-bold text-ink">
                {language === 'bn' ? 'অর্ডারকৃত পণ্যসমূহ' : 'Ordered Products'}
              </h3>
              <span className="caption-3 font-semibold text-muted">
                {order.items.length} {language === 'bn' ? 'টি আইটেম' : 'items'}
              </span>
            </div>

            <div className="p-4 divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={item.productName}
                      className="h-12 w-12 rounded-lg object-cover bg-surface-alt border border-border flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="title-4 font-semibold text-ink block truncate">
                        {item.productName}
                      </span>
                      {item.variantName && (
                        <span className="caption-5 text-quantum font-medium block">
                          {item.variantName}
                        </span>
                      )}
                      <span className="caption-4 text-muted block">
                        {formatCurrency(item.unitPrice, language)} × {formatNumber(item.quantity, language)}
                      </span>
                    </div>
                  </div>

                  <span className="title-4 font-bold text-ink flex-shrink-0">
                    {formatCurrency(item.lineTotal, language)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary & Delivery */}
            <div className="p-4 bg-surface-alt border-t border-border space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <span>{t.cart.subtotal}</span>
                <span className="font-semibold text-ink">{formatCurrency(order.subtotal, language)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>{t.checkout.deliveryFee} ({order.area})</span>
                <span className="font-semibold text-ink">{formatCurrency(order.deliveryCharge, language)}</span>
              </div>
              {order.couponDiscount && order.couponDiscount > 0 ? (
                <div className="flex justify-between text-quantum font-medium">
                  <span>{language === 'bn' ? `কুপন ছাড় (${order.couponCode || ''})` : `Coupon Discount (${order.couponCode || ''})`}</span>
                  <span>-{formatCurrency(order.couponDiscount, language)}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-border flex justify-between text-base font-bold text-ink">
                <span>{t.checkout.total}</span>
                <span className="text-quantum text-lg">{formatCurrency(order.total, language)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Customer & Payment Information Card */}
        {order && (
          <div className="w-full text-left p-5 rounded-2xl border border-border mb-8 bg-surface shadow-sm">
            <h3 className="title-3 font-bold text-ink mb-3 pb-2 border-b border-border">
              {language === 'bn' ? 'ডেলিভারি ও পেমেন্ট বিবরণ' : 'Delivery & Payment Information'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="caption-4 text-muted block">{t.checkout.fullName}</span>
                <span className="font-semibold text-ink block">{order.customerName}</span>
                <span className="caption-4 text-muted block mt-0.5">{order.phone}</span>
              </div>

              <div>
                <span className="caption-4 text-muted block">{t.checkout.address}</span>
                <span className="font-medium text-ink block">{order.address}</span>
                <span className="caption-4 text-quantum font-semibold block mt-0.5">{order.area}</span>
              </div>

              <div>
                <span className="caption-4 text-muted block">{t.checkout.paymentMethod}</span>
                <span className="font-semibold text-ink block">{order.paymentMethod}</span>
                {order.trxId && (
                  <span className="caption-4 font-mono text-muted block mt-0.5">
                    TrxID: <span className="font-bold text-ink">{order.trxId}</span>
                  </span>
                )}
                {order.senderNumber && (
                  <span className="caption-4 text-muted block">
                    Sender: {order.senderNumber}
                  </span>
                )}
              </div>

              <div>
                <span className="caption-4 text-muted block">
                  {language === 'bn' ? 'পেমেন্ট স্ট্যাটাস' : 'Payment Status'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${
                    isCOD
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <FontAwesomeIcon icon={isCOD ? Icons.clock : Icons.shield} className="h-3 w-3" />
                  <span>{paymentStatusLabel}</span>
                </span>
              </div>
            </div>

            {/* Note regarding verification */}
            {!isCOD && (
              <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <FontAwesomeIcon icon={Icons.shield} className="h-3.5 w-3.5 text-blue-700 mt-0.5 flex-shrink-0" />
                <span>
                  {language === 'bn'
                    ? 'ম্যানুয়ালি প্রেরিত TrxID টি আমাদের টিম যাচাই করে তারপর কুরিয়ারে বুকিং করবে।'
                    : 'Our team will verify your submitted Transaction ID before handing over your package to the courier.'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* What Happens Next? (4 Clear Steps) */}
        <div className="w-full text-left rounded-2xl bg-surface-alt border border-border p-5 sm:p-6 mb-8">
          <h3 className="title-3 font-bold text-ink mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={Icons.clock} className="h-4 w-4 text-quantum" />
            <span>{t.orderConfirmed.nextStepsTitle}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-quantum text-white text-xs font-bold flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                <h4 className="title-4 font-semibold text-ink">
                  {language === 'bn' ? 'অর্ডার গ্রহণ' : 'Order Recorded'}
                </h4>
                <p className="caption-4 text-muted mt-0.5">{t.orderConfirmed.step1}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-quantum text-white text-xs font-bold flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                <h4 className="title-4 font-semibold text-ink">
                  {language === 'bn' ? 'কনফার্মেশন কল' : 'Verification Call'}
                </h4>
                <p className="caption-4 text-muted mt-0.5">{t.orderConfirmed.step2}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-quantum text-white text-xs font-bold flex-shrink-0 mt-0.5">
                3
              </span>
              <div>
                <h4 className="title-4 font-semibold text-ink">
                  {language === 'bn' ? 'প্যাকেজিং ও ডিসপ্যাচ' : 'Packaging & Dispatch'}
                </h4>
                <p className="caption-4 text-muted mt-0.5">{t.orderConfirmed.step3}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-quantum text-white text-xs font-bold flex-shrink-0 mt-0.5">
                4
              </span>
              <div>
                <h4 className="title-4 font-semibold text-ink">
                  {language === 'bn' ? 'হোম ডেলিভারি' : 'Doorstep Delivery'}
                </h4>
                <p className="caption-4 text-muted mt-0.5">
                  {language === 'bn'
                    ? 'ঢাকার ভিতরে ১-২ দিন এবং বাইরে ২-৪ দিনের মধ্যে ডেলিভারি সম্পন্ন হবে।'
                    : 'Delivered in 1-2 days inside Dhaka or 2-4 days outside Dhaka.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Track Order, Continue Shopping, Contact Support */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link
            to={`/track-order?order=${displayOrderNumber}`}
            data-testid="track-order-btn"
            className="btn-base flex-1 w-full bg-quantum text-white hover:bg-quantum-hover active:scale-98 button-md font-semibold shadow-sm h-12 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={Icons.delivery} className="h-4 w-4" />
            <span>{t.orderConfirmed.trackOrderButton}</span>
          </Link>

          <a
            href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
              `Hello QuantumTech! Inquiring about my order ${displayOrderNumber}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-base flex-1 w-full bg-surface border border-border text-ink hover:bg-surface-muted hover:border-emerald-300 button-md font-semibold h-12 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={Icons.whatsapp} className="h-4 w-4 text-emerald-600" />
            <span>{t.orderConfirmed.chatSupportButton}</span>
          </a>
        </div>

        <Link
          to="/shop"
          className="caption-2 text-quantum font-semibold hover:underline mt-6 inline-flex items-center gap-1.5"
        >
          <FontAwesomeIcon icon={Icons.chevronLeft} className="h-2.5 w-2.5" />
          <span>{t.orderConfirmed.continueShopping}</span>
        </Link>
      </div>
    </div>
  );
};
