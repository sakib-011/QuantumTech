import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { orderService, PaymentMethodInfo } from '../services/orderService';
import { cartService, ServerCartQuote } from '../services/cartService';
import { settingsService } from '../services/settingsService';
import { promotionService } from '../services/promotionService';
import { formatCurrency, formatNumber } from '../utilities/currency';
import { isValidBangladeshPhone, isValidTrxId, isValidName, isValidAddress } from '../utilities/validation';
import { Icons } from '../utilities/icons';
import { DeliveryArea, PaymentMethod, Coupon } from '../types';
import { Breadcrumb } from '../components/Breadcrumb';
import { customerAuthService } from '../services/customerAuthService';
import { ApiError, isBackendConnected } from '../services/backend';

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, clearCart } = useCart();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [fullName, setFullName] = useState(() => customerAuthService.getSession()?.name || '');
  const [phone, setPhone] = useState(() => customerAuthService.getSession()?.phone || '');
  const [area, setArea] = useState<DeliveryArea>(
    () => customerAuthService.getSession()?.deliveryArea || 'Inside Dhaka'
  );
  const [address, setAddress] = useState(() => customerAuthService.getSession()?.address || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [storeSettings, setStoreSettings] = useState(() => settingsService.getSettings());
  const [serverQuote, setServerQuote] = useState<ServerCartQuote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [backendReady, setBackendReady] = useState(() => isBackendConnected());
  const [paymentMethodsLive, setPaymentMethodsLive] = useState<PaymentMethodInfo[]>([]);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string>('');
  const [couponSuccess, setCouponSuccess] = useState<string>('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    const updateConnection = () => setBackendReady(isBackendConnected());
    window.addEventListener('quantum_backend_connection_updated', updateConnection);
    return () => window.removeEventListener('quantum_backend_connection_updated', updateConnection);
  }, []);

  useEffect(() => {
    const handleSync = () => setStoreSettings(settingsService.getSettings());
    window.addEventListener('quantum_settings_updated', handleSync);
    return () => window.removeEventListener('quantum_settings_updated', handleSync);
  }, []);

  useEffect(() => {
    const session = customerAuthService.getSession();
    if (!session) return;

    let cancelled = false;
    void customerAuthService.getProfile().then((profile) => {
      if (cancelled) return;
      setFullName(profile.name);
      setPhone(profile.phone);
      if (profile.deliveryArea) setArea(profile.deliveryArea);
      if (profile.address) setAddress(profile.address);
    }).catch((error: unknown) => {
      if (cancelled) return;
      if (error instanceof ApiError && error.status === 401) {
        customerAuthService.logout();
        showToast(
          language === 'bn'
            ? 'সেশন শেষ হয়েছে। সংরক্ষিত ঠিকানা লোড করা যায়নি; অতিথি হিসেবে অর্ডার চালিয়ে যেতে পারেন।'
            : 'Your session expired. Saved details could not be loaded; you can continue as a guest.',
          'warning'
        );
      } else if (!session.address || !session.deliveryArea) {
        showToast(
          language === 'bn'
            ? 'সংরক্ষিত ঠিকানা লোড করা যায়নি। অনুগ্রহ করে চেকআউটে ঠিকানা লিখুন।'
            : 'Could not load your saved address. Please enter it at checkout.',
          'warning'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!backendReady) return;
    void orderService.getPaymentMethodsLive()
      .then(setPaymentMethodsLive)
      .catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Failed to load payment options.', 'error'));
  }, [backendReady, showToast]);

  const getLivePaymentMethod = (code: PaymentMethod) =>
    paymentMethodsLive.find((method) => method.code === code);
  const isPaymentMethodUnavailable = (code: PaymentMethod) =>
    getLivePaymentMethod(code)?.available === false;

  useEffect(() => {
    if (isPaymentMethodUnavailable(paymentMethod)) setPaymentMethod('COD');
  }, [paymentMethod, paymentMethodsLive]);

  useEffect(() => {
    if (items.length === 0) {
      setServerQuote(null);
      setQuoteError('');
      return;
    }
    setServerQuote(null);
    setQuoteError('');
    void cartService.validateCartLive(items, area).then((quote) => {
      setServerQuote(quote);
    }).catch((error: unknown) => {
      setQuoteError(error instanceof Error ? error.message : 'Unable to validate your cart with the backend.');
    });
  }, [items, area, backendReady]);

  const effectiveSubtotal = serverQuote ? serverQuote.subtotal : subtotal;
  const deliveryCharge =
    serverQuote && serverQuote.deliveryCharge !== null
      ? serverQuote.deliveryCharge
      : area === 'Inside Dhaka'
      ? storeSettings.deliveryChargeInsideDhaka
      : storeSettings.deliveryChargeOutsideDhaka;
  const totalPayable = Math.max(0, effectiveSubtotal + deliveryCharge - couponDiscount);

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    if (!couponInput.trim()) {
      setCouponError(language === 'bn' ? 'অনুগ্রহ করে কুপন কোড লিখুন।' : 'Please enter a coupon code.');
      return;
    }

    setValidatingCoupon(true);
    try {
      const result = await promotionService.validateCouponLive(couponInput.trim(), items, phone.trim());
      if (result.valid && result.coupon) {
        setAppliedCoupon(result.coupon);
        setCouponDiscount(result.discountAmount);
        setCouponSuccess(
          language === 'bn' ? 'কুপন সফলভাবে যুক্ত হয়েছে!' : 'Coupon applied successfully!'
        );
        setCouponError('');
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponError(result.error || (language === 'bn' ? 'অকার্যকর কুপন কোড।' : 'Invalid coupon code.'));
      }
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
  };

  // Empty Cart Screen
  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-quantum-soft text-quantum mb-4 shadow-sm">
          <FontAwesomeIcon icon={Icons.cart} className="h-8 w-8" />
        </div>
        <h1 className="heading-5 font-bold text-ink mb-2">{t.cart.emptyTitle}</h1>
        <p className="body-4 text-muted mb-6">{t.cart.emptyDesc}</p>
        <Link
          to="/shop"
          className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm"
        >
          {t.cart.startShopping}
        </Link>
      </div>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isValidName(fullName)) {
      newErrors.fullName =
        language === 'bn'
          ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)।'
          : 'Please enter your full name (at least 2 characters).';
    }

    if (!isValidBangladeshPhone(phone)) {
      newErrors.phone =
        language === 'bn'
          ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।'
          : 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).';
    }

    if (!isValidAddress(address)) {
      newErrors.address =
        language === 'bn'
          ? 'অনুগ্রহ করে বিস্তারিত ডেলিভারি ঠিকানা লিখুন (বাসা/রোড/এলাকা/জেলা)।'
          : 'Please enter a complete delivery address (House/Road/Area/District).';
    }

    if (paymentMethod === 'bKash' || paymentMethod === 'Nagad') {
      if (!isValidBangladeshPhone(senderNumber)) {
        newErrors.senderNumber =
          language === 'bn'
            ? 'যে মোবাইল নম্বর থেকে টাকা পাঠিয়েছেন তা সঠিকভাবে লিখুন (১১ ডিজিট)।'
            : 'Please enter the valid 11-digit mobile number you sent money from.';
      }

      if (!isValidTrxId(trxId)) {
        newErrors.trxId =
          language === 'bn'
            ? '৮-১২ অক্ষরের সঠিক Transaction ID (TrxID) প্রদান করুন।'
            : 'Please enter a valid 8-12 character Transaction ID (TrxID).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBackendConnected() || !serverQuote || !serverQuote.valid) {
      showToast(
        quoteError || (language === 'bn'
          ? 'অর্ডার দেওয়ার আগে ব্যাকএন্ডে কার্ট যাচাই সম্পন্ন হতে হবে।'
          : 'Your cart must be validated by the backend before placing an order.'),
        'error'
      );
      return;
    }

    if (!validateForm()) {
      showToast(
        language === 'bn'
          ? 'অনুগ্রহ করে লাল চিহ্নিত তথ্যগুলো সঠিকভাবে পূরণ করুন।'
          : 'Please fix the errors in the form before placing your order.',
        'error'
      );
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems = items.map((item, idx) => ({
        id: `oi-${Date.now()}-${idx}`,
        orderId: '',
        productId: item.product.id,
        variantId: item.selectedVariant?.id,
        productName: item.product.name,
        variantName: item.selectedVariant
          ? language === 'bn'
            ? item.selectedVariant.valueBn || item.selectedVariant.value
            : item.selectedVariant.value
          : undefined,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        image: item.selectedVariant?.image || item.product.images[0],
      }));

      // Set explicit payment status per SRS & user specifications:
      // For COD: "Pending collection"
      // For bKash / Nagad: "Verification pending"
      const paymentStatus =
        paymentMethod === 'COD'
          ? 'Pending collection'
          : 'Verification pending';

      const newOrder = await orderService.submitOrder({
        customerName: fullName.trim(),
        phone: phone.trim().replace(/[\s-]/g, ''),
        area,
        address: address.trim(),
        note: note.trim() || undefined,
        subtotal: serverQuote.subtotal,
        deliveryCharge,
        total: totalPayable,
        paymentMethod,
        paymentStatus,
        trxId:
          paymentMethod === 'bKash' || paymentMethod === 'Nagad'
            ? trxId.trim().toUpperCase()
            : undefined,
        senderNumber:
          paymentMethod === 'bKash' || paymentMethod === 'Nagad'
            ? senderNumber.trim()
            : undefined,
        status: 'Pending',
        language,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
        items: orderItems,
      });

      if (customerAuthService.getSession() && isBackendConnected()) {
        try {
          await customerAuthService.updateProfile({ deliveryArea: area, address: address.trim() });
        } catch {
          showToast(
            language === 'bn'
              ? 'অর্ডার হয়েছে, তবে সংরক্ষিত ঠিকানা আপডেট করা যায়নি। অ্যাকাউন্ট থেকে আবার সংরক্ষণ করুন।'
              : 'Order placed, but your saved address could not be updated. You can save it from your account.',
            'warning'
          );
        }
      }

      // Clear shared cart state
      clearCart();

      // Navigate to order confirmation
      navigate(`/order-confirmation/${newOrder.orderNumber}`);
    } catch (err) {
      console.error('Order creation error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred while saving your order. Please try again.';
      showToast(message, 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: t.cart.title || 'Cart', href: '/cart' },
          { label: t.checkout.title },
        ]}
      />

      <div className="my-6 max-w-3xl">
        <h1 className="heading-4 sm:heading-3 font-bold text-ink">{t.checkout.title}</h1>
        <p className="body-4 text-muted mt-1">{t.checkout.subtitle}</p>
        <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-lg bg-quantum-soft text-quantum text-xs font-semibold">
          <FontAwesomeIcon icon={Icons.shield} className="h-3 w-3" />
          <span>
            {language === 'bn'
              ? 'গেস্ট চেকআউট: কোনো অ্যাকাউন্ট খোলার প্রয়োজন নেই'
              : 'Guest Checkout: No registration required'}
          </span>
        </div>
      </div>

      <form
        onSubmit={handlePlaceOrder}
        noValidate
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left Column: Customer Details & Payment Options */}
        <div className="lg:col-span-7 flex flex-col gap-6 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
          <h2 className="title-2 font-bold text-ink border-b border-border pb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={Icons.delivery} className="h-4 w-4 text-quantum" />
            <span>{t.checkout.deliveryDetails}</span>
          </h2>

          {/* Full Name */}
          <div>
            <label htmlFor="checkout-fullname" className="caption-3 font-semibold text-ink block mb-1.5">
              {t.checkout.fullName} <span className="text-error">*</span>
            </label>
            <input
              id="checkout-fullname"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
              }}
              placeholder={t.checkout.fullNamePlaceholder}
              className={`w-full rounded-xl border px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 ${
                errors.fullName
                  ? 'border-error bg-error-soft/20 focus:ring-error-soft'
                  : 'border-border focus:border-quantum focus:ring-quantum-soft'
              }`}
            />
            {errors.fullName && (
              <p className="caption-5 text-error mt-1.5 flex items-center gap-1">
                <FontAwesomeIcon icon={Icons.error} className="h-3 w-3" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          {/* Phone Number (Bangladeshi 11 Digits) */}
          <div>
            <label htmlFor="checkout-phone" className="caption-3 font-semibold text-ink block mb-1.5">
              {t.checkout.phone} <span className="text-error">*</span>
            </label>
            <input
              id="checkout-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder={t.checkout.phonePlaceholder}
              className={`w-full rounded-xl border px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 ${
                errors.phone
                  ? 'border-error bg-error-soft/20 focus:ring-error-soft'
                  : 'border-border focus:border-quantum focus:ring-quantum-soft'
              }`}
            />
            <p className="caption-5 text-muted mt-1">{t.checkout.phoneHelp}</p>
            {errors.phone && (
              <p className="caption-5 text-error mt-1.5 flex items-center gap-1">
                <FontAwesomeIcon icon={Icons.error} className="h-3 w-3" />
                <span>{errors.phone}</span>
              </p>
            )}
          </div>

          {/* Delivery Area Selection */}
          <div>
            <label className="caption-3 font-semibold text-ink block mb-1.5">
              {t.checkout.area} <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setArea('Inside Dhaka')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  area === 'Inside Dhaka'
                    ? 'border-quantum bg-quantum-soft text-quantum ring-2 ring-quantum-soft font-semibold'
                    : 'border-border bg-surface text-ink hover:bg-surface-alt'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center ${
                    area === 'Inside Dhaka' ? 'border-quantum bg-quantum' : 'border-slate-300'
                  }`}
                >
                  {area === 'Inside Dhaka' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="title-4 font-semibold block">
                    {language === 'bn' ? 'ঢাকার ভিতরে' : 'Inside Dhaka'} (৳
                    {storeSettings.deliveryChargeInsideDhaka})
                  </span>
                  <span className="caption-5 text-muted block mt-0.5">
                    {language === 'bn' ? '১-২ কার্যদিবসের মধ্যে ডেলিভারি' : '1-2 business days delivery'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setArea('Outside Dhaka')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  area === 'Outside Dhaka'
                    ? 'border-quantum bg-quantum-soft text-quantum ring-2 ring-quantum-soft font-semibold'
                    : 'border-border bg-surface text-ink hover:bg-surface-alt'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center ${
                    area === 'Outside Dhaka' ? 'border-quantum bg-quantum' : 'border-slate-300'
                  }`}
                >
                  {area === 'Outside Dhaka' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="title-4 font-semibold block">
                    {language === 'bn' ? 'ঢাকার বাইরে' : 'Outside Dhaka'} (৳
                    {storeSettings.deliveryChargeOutsideDhaka})
                  </span>
                  <span className="caption-5 text-muted block mt-0.5">
                    {language === 'bn' ? '২-৪ কার্যদিবসের মধ্যে ডেলিভারি' : '2-4 business days delivery'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label htmlFor="checkout-address" className="caption-3 font-semibold text-ink block mb-1.5">
              {t.checkout.address} <span className="text-error">*</span>
            </label>
            <textarea
              id="checkout-address"
              rows={3}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
              }}
              placeholder={t.checkout.addressPlaceholder}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                errors.address
                  ? 'border-error bg-error-soft/20 focus:ring-error-soft'
                  : 'border-border focus:border-quantum focus:ring-quantum-soft'
              }`}
            />
            {errors.address && (
              <p className="caption-5 text-error mt-1.5 flex items-center gap-1">
                <FontAwesomeIcon icon={Icons.error} className="h-3 w-3" />
                <span>{errors.address}</span>
              </p>
            )}
          </div>

          {/* Optional Order Note */}
          <div>
            <label htmlFor="checkout-note" className="caption-3 font-semibold text-ink block mb-1.5">
              {t.checkout.notes}
            </label>
            <input
              id="checkout-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.checkout.notesPlaceholder}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft"
            />
          </div>

          {/* Payment Method Section (3 Options: COD, bKash, Nagad) */}
          <div className="pt-4 border-t border-border">
            <h2 className="title-2 font-bold text-ink mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.card} className="h-4 w-4 text-quantum" />
              <span>{t.checkout.paymentMethod}</span>
            </h2>

            <div className="flex flex-col gap-3">
              {/* Option 1: Cash on Delivery (COD) */}
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-quantum bg-quantum-soft text-quantum font-semibold ring-2 ring-quantum-soft'
                    : 'border-border bg-surface text-ink hover:bg-surface-alt'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center ${
                    paymentMethod === 'COD' ? 'border-quantum bg-quantum' : 'border-slate-300'
                  }`}
                >
                  {paymentMethod === 'COD' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="title-4 font-semibold block">{t.checkout.cod}</span>
                  <span className="caption-4 text-muted block mt-0.5">{t.checkout.codDesc}</span>
                </div>
              </button>

              {/* Option 2: bKash (Manual Send Money) */}
              <button
                type="button"
                disabled={isPaymentMethodUnavailable('bKash')}
                onClick={() => setPaymentMethod('bKash')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  paymentMethod === 'bKash'
                    ? 'border-pink-600 bg-pink-50 text-pink-700 font-semibold ring-2 ring-pink-200'
                    : 'border-border bg-surface text-ink hover:bg-surface-alt'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center ${
                    paymentMethod === 'bKash' ? 'border-pink-600 bg-pink-600' : 'border-slate-300'
                  }`}
                >
                  {paymentMethod === 'bKash' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="title-4 font-semibold block">
                    {getLivePaymentMethod('bKash')?.name || 'bKash'} (Send Money - Personal)
                    {isPaymentMethodUnavailable('bKash') && (
                      <span className="ml-2 text-xs font-normal">
                        {language === 'bn' ? 'অনুপলব্ধ' : 'Unavailable'}
                      </span>
                    )}
                  </span>
                  <span className="caption-4 text-muted block mt-0.5">
                    {language === 'bn'
                      ? 'ম্যানুয়ালি bKash নম্বরে সেন্ড মানি করুন ও নিচে TrxID দিন'
                      : 'Send money manually to our bKash personal number & provide TrxID below'}
                  </span>
                </div>
              </button>

              {/* Option 3: Nagad (Manual Send Money) */}
              <button
                type="button"
                disabled={isPaymentMethodUnavailable('Nagad')}
                onClick={() => setPaymentMethod('Nagad')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  paymentMethod === 'Nagad'
                    ? 'border-orange-600 bg-orange-50 text-orange-700 font-semibold ring-2 ring-orange-200'
                    : 'border-border bg-surface text-ink hover:bg-surface-alt'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center ${
                    paymentMethod === 'Nagad' ? 'border-orange-600 bg-orange-600' : 'border-slate-300'
                  }`}
                >
                  {paymentMethod === 'Nagad' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="title-4 font-semibold block">
                    {getLivePaymentMethod('Nagad')?.name || 'Nagad'} (Send Money - Personal)
                    {isPaymentMethodUnavailable('Nagad') && (
                      <span className="ml-2 text-xs font-normal">
                        {language === 'bn' ? 'অনুপলব্ধ' : 'Unavailable'}
                      </span>
                    )}
                  </span>
                  <span className="caption-4 text-muted block mt-0.5">
                    {language === 'bn'
                      ? 'ম্যানুয়ালি Nagad নম্বরে সেন্ড মানি করুন ও নিচে TrxID দিন'
                      : 'Send money manually to our Nagad personal number & provide TrxID below'}
                  </span>
                </div>
              </button>
            </div>

            {/* Cash on Delivery Information Banner */}
            {paymentMethod === 'COD' && (
              <div className="mt-4 p-4 rounded-xl bg-surface-alt border border-border text-xs text-muted space-y-1.5 animate-fadeIn">
                <p className="font-semibold text-ink flex items-center gap-1.5">
                  <FontAwesomeIcon icon={Icons.cod} className="h-3.5 w-3.5 text-quantum" />
                  <span>
                    {language === 'bn'
                      ? 'ক্যাশ অন ডেলিভারি নির্দেশিকা'
                      : 'Cash on Delivery Guidelines'}
                  </span>
                </p>
                <p>
                  {language === 'bn'
                    ? 'ডেলিভারি ম্যান পণ্য নিয়ে পৌঁছানোর পর আপনি পার্সেল যাচাই করে সম্পূর্ণ মূল্য নগদে পরিশোধ করতে পারবেন।'
                    : 'Pay with physical cash to the courier representative when the parcel arrives at your doorstep.'}
                </p>
              </div>
            )}

            {/* Manual bKash / Nagad Payment Instructions & Input Fields */}
            {(paymentMethod === 'bKash' || paymentMethod === 'Nagad') && (
              <div className="mt-4 p-5 rounded-xl bg-surface-alt border border-border flex flex-col gap-4 animate-fadeIn">
                {/* Instructions Box */}
                <div
                  className={`p-4 rounded-xl text-sm ${
                    paymentMethod === 'bKash'
                      ? 'bg-pink-100/70 border border-pink-200 text-pink-900'
                      : 'bg-orange-100/70 border border-orange-200 text-orange-900'
                  }`}
                >
                  <p className="font-bold text-base mb-1">
                    {paymentMethod === 'bKash' ? 'bKash' : 'Nagad'} Personal Number:{' '}
                    <span className="font-mono tracking-wide underline">
                      {paymentMethod === 'bKash'
                        ? getLivePaymentMethod(paymentMethod)?.merchantNumber || storeSettings.bKashNumber
                        : getLivePaymentMethod(paymentMethod)?.merchantNumber || storeSettings.nagadNumber}
                    </span>
                  </p>
                  <p className="font-semibold text-xs mb-2">
                    {language === 'bn' ? 'সেন্ড মানি করার পরিমাণ:' : 'Exact Send Money Amount:'}{' '}
                    <span className="text-base font-bold">
                      {formatCurrency(totalPayable, language)}
                    </span>
                  </p>

                  {getLivePaymentMethod(paymentMethod) ? (
                    <ol className="text-xs space-y-1 pl-4 list-decimal">
                      {(language === 'bn'
                        ? getLivePaymentMethod(paymentMethod)?.instructionsBn
                        : getLivePaymentMethod(paymentMethod)?.instructions
                      )?.map((instruction, index) => <li key={index}>{instruction}</li>)}
                    </ol>
                  ) : (
                    <ol className="text-xs space-y-1 pl-4 list-decimal">
                      <li>
                        {language === 'bn'
                          ? `আপনার ${paymentMethod} অ্যাপ ওপেন করুন অথবা ডায়াল করুন।`
                          : `Open your ${paymentMethod} App or dial USSD.`}
                      </li>
                      <li>
                        {language === 'bn'
                          ? 'মেনু থেকে "Send Money" (সেন্ড মানি) অপশন বাছাই করুন।'
                          : 'Select "Send Money" (Personal).'}
                      </li>
                      <li>
                        {language === 'bn'
                          ? `প্রাপক নম্বর দিন: ${
                              paymentMethod === 'bKash' ? storeSettings.bKashNumber : storeSettings.nagadNumber
                            }`
                          : `Enter recipient number: ${
                              paymentMethod === 'bKash' ? storeSettings.bKashNumber : storeSettings.nagadNumber
                            }`}
                      </li>
                      <li>
                        {language === 'bn'
                          ? `সঠিক টাকার পরিমাণ দিন: ${formatCurrency(totalPayable, language)}`
                          : `Enter amount: ${formatCurrency(totalPayable, language)}`}
                      </li>
                      <li>
                        {language === 'bn'
                          ? 'লেনদেন সম্পন্ন করে মেসেজ থেকে Transaction ID (TrxID) কপি করুন এবং নিচের ঘরে লিখুন।'
                          : 'Complete payment and copy the Transaction ID (TrxID) into the field below.'}
                      </li>
                    </ol>
                  )}
                </div>

                {/* Sender Mobile Number */}
                <div>
                  <label htmlFor="checkout-sender" className="caption-3 font-semibold text-ink block mb-1">
                    {t.checkout.senderNumber} <span className="text-error">*</span>
                  </label>
                  <input
                    id="checkout-sender"
                    type="tel"
                    value={senderNumber}
                    onChange={(e) => {
                      setSenderNumber(e.target.value);
                      if (errors.senderNumber) setErrors((prev) => ({ ...prev, senderNumber: '' }));
                    }}
                    placeholder="01XXXXXXXXX"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-ink focus:outline-none ${
                      errors.senderNumber
                        ? 'border-error bg-error-soft/20 focus:ring-error-soft'
                        : 'border-border focus:border-quantum focus:ring-2 focus:ring-quantum-soft'
                    }`}
                  />
                  {errors.senderNumber && (
                    <p className="caption-5 text-error mt-1 flex items-center gap-1">
                      <FontAwesomeIcon icon={Icons.error} className="h-3 w-3" />
                      <span>{errors.senderNumber}</span>
                    </p>
                  )}
                </div>

                {/* Transaction ID */}
                <div>
                  <label htmlFor="checkout-trxid" className="caption-3 font-semibold text-ink block mb-1">
                    {t.checkout.trxId} <span className="text-error">*</span>
                  </label>
                  <input
                    id="checkout-trxid"
                    type="text"
                    value={trxId}
                    onChange={(e) => {
                      setTrxId(e.target.value.toUpperCase());
                      if (errors.trxId) setErrors((prev) => ({ ...prev, trxId: '' }));
                    }}
                    placeholder={t.checkout.trxIdPlaceholder || 'e.g. 9J2K8L1M'}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-ink font-mono uppercase tracking-wider focus:outline-none ${
                      errors.trxId
                        ? 'border-error bg-error-soft/20 focus:ring-error-soft'
                        : 'border-border focus:border-quantum focus:ring-2 focus:ring-quantum-soft'
                    }`}
                  />
                  <p className="caption-5 text-muted mt-1">
                    {language === 'bn'
                      ? 'পেমেন্ট মেসেজ থেকে পাওয়া ৮-১২ অক্ষরের TrxID লিখুন।'
                      : 'Enter the 8-12 alphanumeric characters received in your confirmation SMS.'}
                  </p>
                  {errors.trxId && (
                    <p className="caption-5 text-error mt-1 flex items-center gap-1">
                      <FontAwesomeIcon icon={Icons.error} className="h-3 w-3" />
                      <span>{errors.trxId}</span>
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-surface border border-border text-xs text-muted flex items-start gap-2">
                  <FontAwesomeIcon icon={Icons.shield} className="h-3.5 w-3.5 text-quantum mt-0.5" />
                  <span>
                    {language === 'bn'
                      ? 'অর্ডার গ্রহণের পর আমাদের প্রতিনিধি ম্যানুয়ালি TrxID ও পেমেন্ট বিবরণ যাচাই করবেন।'
                      : 'Our verification team will cross-check this TrxID before dispatching your order.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary (Products, Variants, Subtotal, Delivery, Total) */}
        <div className="lg:col-span-5 flex flex-col gap-6 bg-surface p-6 rounded-2xl border border-border shadow-sm sticky top-24">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="title-2 font-bold text-ink">
              {t.checkout.orderSummary}
            </h2>
            <span className="caption-2 font-semibold text-quantum bg-quantum-soft px-2.5 py-0.5 rounded-full">
              {items.length} {language === 'bn' ? 'টি আইটেম' : 'items'}
            </span>
          </div>

          {/* Itemized Products List */}
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto divide-y divide-border scrollbar-none pr-1">
            {items.map((item) => {
              const itemTitle = language === 'bn' ? item.product.nameBn : item.product.name;
              const variantLabel = item.selectedVariant
                ? language === 'bn'
                  ? item.selectedVariant.valueBn || item.selectedVariant.value
                  : item.selectedVariant.value
                : null;
              const itemImage =
                item.selectedVariant?.image ||
                item.product.images[0] ||
                'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=200&q=80';

              return (
                <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={itemImage}
                      alt={itemTitle}
                      className="h-12 w-12 rounded-lg object-cover bg-surface-alt border border-border flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="title-4 font-semibold text-ink block truncate">{itemTitle}</span>
                      {variantLabel && (
                        <span className="caption-5 text-quantum font-medium block">
                          {variantLabel}
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
              );
            })}
          </div>

          {/* Coupon Code Section */}
          <div className="pt-3 border-t border-border">
            <label className="caption-3 font-semibold text-ink block mb-1.5 flex items-center gap-1.5">
              <FontAwesomeIcon icon={Icons.coupon} className="h-3.5 w-3.5 text-quantum" />
              <span>{language === 'bn' ? 'প্রোমো বা ডিসকাউন্ট কুপন' : 'Promotional Coupon'}</span>
            </label>
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  data-testid="coupon-input"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    if (couponError) setCouponError('');
                  }}
                  placeholder={language === 'bn' ? 'কুপন কোড (যেমন EID20)' : 'Coupon code (e.g. EID20)'}
                  className="flex-1 rounded-xl border border-border px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-ink focus:border-quantum focus:ring-1 focus:ring-quantum focus:outline-none"
                />
                <button
                  type="button"
                  data-testid="apply-coupon-btn"
                  onClick={() => void handleApplyCoupon()}
                  disabled={validatingCoupon}
                  className="btn-base px-4 py-2 rounded-xl bg-ink text-white hover:bg-slate-800 text-xs font-semibold"
                >
                  {validatingCoupon
                    ? (language === 'bn' ? 'যাচাই হচ্ছে...' : 'Checking...')
                    : (language === 'bn' ? 'প্রয়োগ' : 'Apply')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-quantum-soft/40 border border-quantum/30 text-xs">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.circleCheck} className="h-4 w-4 text-quantum" />
                  <div>
                    <span className="font-bold text-ink">{appliedCoupon.code}</span>
                    <span className="text-quantum ml-1 font-semibold">
                      (-{formatCurrency(couponDiscount, language)})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="remove-coupon-btn"
                  onClick={handleRemoveCoupon}
                  className="text-xs text-error hover:underline font-semibold"
                >
                  {language === 'bn' ? 'বাতিল' : 'Remove'}
                </button>
              </div>
            )}

            {couponError && (
              <p data-testid="coupon-error" className="caption-5 text-error mt-1.5 flex items-center gap-1">
                <FontAwesomeIcon icon={Icons.error} className="h-3 w-3" />
                <span>{couponError}</span>
              </p>
            )}
            {couponSuccess && !couponError && (
              <p data-testid="coupon-success" className="caption-5 text-success mt-1.5 flex items-center gap-1">
                <FontAwesomeIcon icon={Icons.circleCheck} className="h-3 w-3" />
                <span>{couponSuccess}</span>
              </p>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-4 border-t border-border flex flex-col gap-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t.cart.subtotal}</span>
              <span className="font-semibold text-ink">{formatCurrency(effectiveSubtotal, language)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">
                {t.checkout.deliveryFee} ({area === 'Inside Dhaka' ? (language === 'bn' ? 'ঢাকার ভিতরে' : 'Inside Dhaka') : (language === 'bn' ? 'ঢাকার বাইরে' : 'Outside Dhaka')})
              </span>
              <span className="font-semibold text-ink">{formatCurrency(deliveryCharge, language)}</span>
            </div>

            {appliedCoupon && couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-quantum font-medium">
                <span>{language === 'bn' ? `কুপন ছাড় (${appliedCoupon.code})` : `Coupon Discount (${appliedCoupon.code})`}</span>
                <span data-testid="coupon-discount-display">-{formatCurrency(couponDiscount, language)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-between items-baseline">
              <span className="title-2 font-bold text-ink">{t.checkout.total}</span>
              <span data-testid="checkout-total-payable" className="heading-5 font-bold text-quantum">
                {formatCurrency(totalPayable, language)}
              </span>
            </div>
          </div>

          {/* Place Order CTA Button */}
          {!serverQuote?.valid && (
            <p role="status" className="caption-3 text-center text-amber-700">
              {serverQuote?.issues.join(' ') || quoteError || (backendReady
                ? (language === 'bn' ? 'ব্যাকএন্ডে কার্ট যাচাই হচ্ছে…' : 'Validating cart with the backend…')
                : (language === 'bn' ? 'ব্যাকএন্ড সংযোগের জন্য অপেক্ষা করা হচ্ছে…' : 'Waiting for the backend connection…'))}
            </p>
          )}
          <button
            type="submit"
            data-testid="place-order-btn"
            disabled={isSubmitting || !backendReady || !serverQuote?.valid}
            className="btn-base w-full bg-quantum text-white hover:bg-quantum-hover active:scale-98 button-lg shadow-sm h-12 mt-2 font-semibold disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.spinner} className="animate-spin h-4 w-4" />
                <span>{t.checkout.processing}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.circleCheck} className="h-4 w-4" />
                <span>
                  {t.checkout.placeOrder} • {formatCurrency(totalPayable, language)}
                </span>
              </span>
            )}
          </button>

          <p className="caption-5 text-muted text-center leading-relaxed">
            {t.checkout.privacyNotice}
          </p>
        </div>
      </form>
    </div>
  );
};
