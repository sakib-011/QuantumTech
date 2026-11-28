import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { orderService } from '../services/orderService';
import { settingsService } from '../services/settingsService';
import { useToast } from '../context/ToastContext';
// Added import for language context
import { useLanguage } from '../context/LanguageContext';
import { Order, OrderStatus } from '../types';
import { PaymentMethodInfo } from '../services/orderService';
import { Icons } from '../utilities/icons';
import { formatCurrency, formatNumber } from '../utilities/currency';
import { Breadcrumb } from '../components/Breadcrumb';
import { isBackendConnected } from '../services/backend';

export const TrackOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [backendReady, setBackendReady] = useState(() => isBackendConnected());
  const [trxId, setTrxId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  // Load payment methods on mount (for checking requirements)
  useEffect(() => {
    const updateConnection = () => setBackendReady(isBackendConnected());
    window.addEventListener('quantum_backend_connection_updated', updateConnection);
    return () => window.removeEventListener('quantum_backend_connection_updated', updateConnection);
  }, []);

  useEffect(() => {
    if (!backendReady) return;
    void orderService.getPaymentMethodsLive()
      .then(setPaymentMethods)
      .catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Failed to load payment options.', 'error'));
  }, [backendReady, showToast]);

  const handleResubmit = async () => {
    if (!trackedOrder) return;
    setIsResubmitting(true);
    const result = await orderService.resubmitPaymentLive(
      trackedOrder.orderNumber,
      trackedOrder.phone,
      trxId,
      senderNumber,
      trackedOrder.language ?? 'en'
    );
    setIsResubmitting(false);
    if (result.success && result.order) {
      setTrackedOrder(result.order);
      showToast(
        language === 'bn' ? 'পেমেন্ট সফলভাবে রিসাবমিট করা হয়েছে।' : 'Payment resubmitted successfully.',
        'success'
      );
    } else {
      showToast(
        result.error || (language === 'bn' ? 'পেমেন্ট রিসাবমিট ব্যর্থ হয়েছে।' : 'Failed to resubmit payment.'),
        'error'
      );
    }
  };

  const [phone, setPhone] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [settings, setSettings] = useState(() => settingsService.getSettings());

  useEffect(() => {
    const handleSyncSettings = () => setSettings(settingsService.getSettings());
    window.addEventListener('quantum_settings_updated', handleSyncSettings);
    return () => window.removeEventListener('quantum_settings_updated', handleSyncSettings);
  }, []);

  // Listen for order updates from admin portal in real-time
  useEffect(() => {
    const handleOrderSync = () => {
      if (trackedOrder) {
        const refreshed = orderService.getOrderById(trackedOrder.id) || orderService.getOrderByNumber(trackedOrder.orderNumber);
        if (refreshed) {
          setTrackedOrder(refreshed);
        }
      }
    };
    window.addEventListener('quantum_orders_updated', handleOrderSync);
    return () => window.removeEventListener('quantum_orders_updated', handleOrderSync);
  }, [trackedOrder]);

  // Auto-search if order param exists in URL
  useEffect(() => {
    const urlOrder = searchParams.get('order');
    if (urlOrder) {
      setOrderNumber(urlOrder);
      const existing = orderService.getOrderByNumber(urlOrder);
      if (existing) {
        setPhone(existing.phone);
        setTrackedOrder(existing);
        setHasSearched(true);
      }
    }
  }, [searchParams]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void track(orderNumber, phone);
  };

  const track = async (rawNumber: string, rawPhone: string) => {
    setErrorMessage('');
    setHasSearched(true);

    const cleanNum = rawNumber.trim();
    const cleanPhone = rawPhone.trim().replace(/[\s-]/g, '');

    if (!cleanNum || !cleanPhone) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে অর্ডার নম্বর এবং নিবন্ধিত মোবাইল নম্বর উভয়ই লিখুন।'
          : 'Please provide both Order Number and registered Mobile Phone Number.'
      );
      setTrackedOrder(null);
      return;
    }

    const result = await orderService.trackOrderLive(cleanNum, cleanPhone);
    if (result.success && result.order) {
      setTrackedOrder(result.order);
      setErrorMessage('');
    } else {
      setTrackedOrder(null);
      setErrorMessage(
        result.error ||
          (language === 'bn'
            ? 'প্রদত্ত অর্ডার নম্বর ও মোবাইল নম্বরের সাথে কোনো অর্ডার পাওয়া যায়নি। নম্বর দুটি যাচাই করে পুনরায় চেষ্টা করুন।'
            : 'No matching order found for this order number and mobile phone combination. Please verify your details.')
      );
    }
  };

  const steps: { key: OrderStatus; labelEn: string; labelBn: string; icon: any }[] = [
    { key: 'Pending', labelEn: 'Order Placed', labelBn: 'অর্ডার গৃহীত', icon: Icons.order },
    { key: 'Confirmed', labelEn: 'Confirmed', labelBn: 'কনফার্ম হয়েছে', icon: Icons.circleCheck },
    { key: 'Shipped', labelEn: 'Shipped', labelBn: 'কুরিয়ারে হস্তান্তর', icon: Icons.delivery },
    { key: 'Delivered', labelEn: 'Delivered', labelBn: 'ডেলিভারি সম্পন্ন', icon: Icons.check },
  ];

  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'Pending':
        return 0;
      case 'Confirmed':
        return 1;
      case 'Shipped':
        return 2;
      case 'Delivered':
        return 3;
      case 'Cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const getStatusDate = (status: OrderStatus, order: Order): string | null => {
    if (status === 'Pending') {
      return new Date(order.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    const log = order.history?.find((h) => h.toStatus === status);
    if (log && log.changedAt) {
      return new Date(log.changedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return null;
  };

  const cancellationDate = trackedOrder?.history?.find((h) => h.toStatus === 'Cancelled')?.changedAt || trackedOrder?.updatedAt;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: language === 'bn' ? 'অর্ডার ট্র্যাক' : 'Track Order' },
        ]}
      />

      <div className="text-center my-6 max-w-xl mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-quantum-soft text-quantum flex items-center justify-center mx-auto mb-3 shadow-sm">
          <FontAwesomeIcon icon={Icons.delivery} className="h-7 w-7" />
        </div>
        <h1 className="heading-4 sm:heading-3 font-bold text-ink">{t.track.title}</h1>
        <p className="body-4 text-muted mt-1.5">{t.track.subtitle}</p>
      </div>

      {/* Lookup Form */}
      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm mb-8">
        <form onSubmit={handleTrackSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-5">
            <label htmlFor="track-order-num" className="caption-3 font-semibold text-ink block mb-1.5">
              {t.track.orderNumberLabel} <span className="text-error">*</span>
            </label>
            <input
              id="track-order-num"
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. QT-261119-024"
              required
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft uppercase font-mono"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="track-order-phone" className="caption-3 font-semibold text-ink block mb-1.5">
              {t.track.phoneLabel} <span className="text-error">*</span>
            </label>
            <input
              id="track-order-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              required
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              data-testid="track-submit-btn"
              className="btn-base w-full bg-quantum text-white hover:bg-quantum-hover active:scale-98 button-md font-semibold shadow-sm h-11 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={Icons.search} className="h-4 w-4" />
              <span>{t.track.trackButton}</span>
            </button>
          </div>
        </form>

        <p className="caption-5 text-muted mt-3 pt-3 border-t border-border flex items-center gap-1.5">
          <FontAwesomeIcon icon={Icons.shield} className="h-3 w-3 text-quantum" />
          <span>
            {language === 'bn'
              ? 'নিরাপত্তার স্বার্থে অর্ডার নম্বর ও ফোন নম্বর উভয় মিললেই কেবল অর্ডারের বিবরণ প্রদর্শিত হবে।'
              : 'For security, order information is only displayed when both fields match.'}
          </span>
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-error-soft text-error text-sm font-medium mb-8 flex items-center gap-3 border border-error/20 animate-fadeIn">
          <FontAwesomeIcon icon={Icons.warning} className="h-5 w-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Order Tracking Result View */}
      {trackedOrder && (
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
            <div>
              <span className="caption-4 text-muted block uppercase tracking-wider font-semibold">
                {language === 'bn' ? 'অর্ডারের বিবরণ' : 'Order Information'}
              </span>
              <span className="heading-5 sm:heading-4 font-mono font-bold text-quantum block mt-0.5">
                {trackedOrder.orderNumber}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="caption-4 text-muted bg-surface-alt px-3 py-1 rounded-lg border border-border">
                {new Date(trackedOrder.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>

              {/* Status Badge */}
              <span
                className={`caption-3 px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                  trackedOrder.status === 'Cancelled'
                    ? 'bg-error text-white'
                    : trackedOrder.status === 'Delivered'
                    ? 'bg-success text-white'
                    : 'bg-quantum text-white'
                }`}
              >
                <FontAwesomeIcon
                  icon={
                    trackedOrder.status === 'Cancelled'
                      ? Icons.error
                      : trackedOrder.status === 'Delivered'
                      ? Icons.check
                      : Icons.delivery
                  }
                  className="h-3 w-3"
                />
                <span>{trackedOrder.status}</span>
              </span>
            </div>
          </div>

          {/* CANCELLED ORDER VIEW: Clear Red Alert & Cancellation Date (No Progress Bar) */}
          {trackedOrder.status === 'Cancelled' ? (
            <div className="p-5 rounded-2xl bg-error-soft border border-error/20 text-error flex flex-col sm:flex-row items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-error text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <FontAwesomeIcon icon={Icons.error} className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="title-2 font-bold text-error">
                    {language === 'bn' ? 'অর্ডারটি বাতিল করা হয়েছে' : 'Order Cancelled'}
                  </h3>
                  {cancellationDate && (
                    <span className="caption-3 font-semibold text-error/80">
                      Cancelled on:{' '}
                      {new Date(cancellationDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <p className="body-4 text-error/90 mt-1.5 leading-relaxed">
                  Reason:{' '}
                  {trackedOrder.cancellationReason ||
                    (language === 'bn'
                      ? 'গ্রাহকের অনুরোধে বা স্টকের কারণে অর্ডারটি বাতিল করা হয়েছে।'
                      : 'Delivery cancelled upon customer request or stock unavailability.')}
                </p>
              </div>
            </div>
          ) : (
            /* NORMAL 4-STAGE PROGRESS INDICATOR */
            <div className="py-6 px-2">
              <div className="grid grid-cols-4 relative">
                {/* Connecting Progress Bar */}
                <div className="absolute top-5 left-1/8 right-1/8 h-1 bg-slate-200 -z-0">
                  <div
                    className="h-full bg-quantum transition-all duration-500 ease-out"
                    style={{
                      width: `${(getStepIndex(trackedOrder.status) / (steps.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {steps.map((s, idx) => {
                  const currentIdx = getStepIndex(trackedOrder.status);
                  const isCompleted = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const stageDate = getStatusDate(s.key, trackedOrder);
                  const label = language === 'bn' ? s.labelBn : s.labelEn;

                  return (
                    <div key={s.key} className="flex flex-col items-center text-center z-10 px-1">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-quantum text-white ring-4 ring-quantum-soft shadow-sm'
                            : 'bg-surface border-2 border-slate-300 text-slate-400'
                        }`}
                      >
                        <FontAwesomeIcon icon={s.icon} className="h-4 w-4" />
                      </div>

                      <span
                        className={`title-5 mt-2.5 block leading-tight ${
                          isCurrent ? 'font-bold text-quantum' : isCompleted ? 'font-semibold text-ink' : 'font-medium text-muted'
                        }`}
                      >
                        {label}
                      </span>

                      {stageDate && (
                        <span className="caption-5 text-muted mt-0.5 block leading-tight">
                          {stageDate}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery & Payment Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-surface-alt border border-border text-sm">
            <div>
              <span className="caption-4 text-muted block font-semibold uppercase tracking-wider mb-1">
                {language === 'bn' ? 'প্রাপক ও ঠিকানা' : 'Recipient & Address'}
              </span>
              <span className="title-4 font-bold text-ink block">{trackedOrder.customerName}</span>
              <span className="caption-3 text-muted block mt-0.5">{trackedOrder.phone}</span>
              <span className="caption-3 text-ink font-medium block mt-1 leading-snug">
                {trackedOrder.address} ({trackedOrder.area})
              </span>
            </div>

            <div>
              <span className="caption-4 text-muted block font-semibold uppercase tracking-wider mb-1">
                {language === 'bn' ? 'পেমেন্ট ও মোট মূল্য' : 'Payment & Total'}
              </span>
              <span className="title-4 font-bold text-ink block">
                {trackedOrder.paymentMethod}
              </span>
              <span className="caption-3 font-semibold text-quantum block mt-0.5">
                Status: {trackedOrder.paymentStatus}
              </span>
              <span className="title-3 font-bold text-ink block mt-1.5">
                Total: {formatCurrency(trackedOrder.total, language)}
              </span>
            </div>
          </div>

          {/* Ordered Products Breakdown */}
          {/* Payment‑Resubmit UI (if pending and requires TxID) */}
          {(trackedOrder.paymentStatus === 'Verification pending'
            || trackedOrder.paymentStatus === 'Failed') && (
            (() => {
              const methodInfo = paymentMethods.find((m) => m.code === trackedOrder.paymentMethod);
              if (!methodInfo?.requiresTrxId) return null;
              return (
                <div className="mt-6 p-6 bg-surface rounded-xl border border-border">
                  <h3 className="title-4 font-semibold mb-4 text-ink">
                    {language === 'bn' ? 'পেমেন্ট রিসাবমিট করুন' : 'Resubmit Payment'}
                  </h3>
                  {trackedOrder.paymentStatus === 'Failed' && (
                    <div
                      role="status"
                      className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
                    >
                      {language === 'bn'
                        ? 'আপনার আগের পেমেন্ট নিশ্চিত করা যায়নি। TxID বা সেন্ডার নম্বরে ভুল থাকলে সঠিক তথ্য দিয়ে নিচে আবার জমা দিন। নতুন তথ্য যাচাইয়ের জন্য পাঠানো হবে।'
                        : 'Your previous payment confirmation could not be verified. If the TxID or sender number was entered incorrectly, submit the corrected details below for another review.'}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="caption-3 font-medium text-ink block mb-1.5">
                        {language === 'bn' ? 'ট্রানজ্যাকশন আইডি (TxID)' : 'Transaction ID (TxID)'}
                      </label>
                      <input
                        type="text"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        placeholder={language === 'bn' ? 'TxID লিখুন' : 'Enter TxID'}
                        className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft"
                      />
                    </div>
                    <div>
                      <label className="caption-3 font-medium text-ink block mb-1.5">
                        {language === 'bn' ? 'সেন্ডার নম্বর' : 'Sender Number'}
                      </label>
                      <input
                        type="text"
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        placeholder={language === 'bn' ? 'সেন্ডার মোবাইল নম্বর লিখুন' : 'Enter sender mobile number'}
                        className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResubmit}
                    disabled={isResubmitting}
                    className="btn-base w-full bg-quantum text-white hover:bg-quantum-hover disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isResubmitting ? (language === 'bn' ? 'প্রসেস হচ্ছে…' : 'Processing…') : (language === 'bn' ? 'পেমেন্ট রিসাবমিট করুন' : 'Resubmit Payment')}
                  </button>
                </div>
              );
            })()
          )}
          {/* Ordered Products Breakdown */}
          <div>
            <h3 className="title-3 font-bold text-ink mb-3 pb-2 border-b border-border">
              {language === 'bn' ? 'অর্ডারকৃত পণ্যসমূহ' : 'Ordered Items'}
            </h3>

            <div className="divide-y divide-border">
              {trackedOrder.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-sm">
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
                      <span className="font-semibold text-ink block truncate">{item.productName}</span>
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
          </div>

          {/* Support Helpline Bar */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted">
              {language === 'bn'
                ? 'অর্ডার সংক্রান্ত যেকোনো সহায়তায় আমাদের জানান'
                : 'Have questions or need to modify your delivery?'}
            </span>
            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `Hello QuantumTech, inquiry regarding order ${trackedOrder.orderNumber}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-quantum hover:underline flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={Icons.whatsapp} className="h-3.5 w-3.5 text-emerald-600" />
              <span>{language === 'bn' ? 'হোয়াটসঅ্যাপে যোগাযোগ করুন' : 'Chat on WhatsApp Support'}</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
