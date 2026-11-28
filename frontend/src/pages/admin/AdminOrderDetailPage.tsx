import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { orderService } from '../../services/orderService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { Icons } from '../../utilities/icons';
import { formatCurrency, formatNumber } from '../../utilities/currency';
import { Modal } from '../../components/Modal';
import { InvoicePrint } from '../../components/InvoicePrint';

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  const [order, setOrder] = useState<Order | null>(() => {
    return id ? orderService.getOrderById(id) || orderService.getOrderByNumber(id) || null : null;
  });

  // Cancellation Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer requested order cancellation');

  // Failed payment confirmation modal
  const [failPaymentModalOpen, setFailPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const found = orderService.getOrderById(id) || orderService.getOrderByNumber(id);
      if (found) {
        setOrder(found);
      } else {
        showToast('Order not found.', 'error');
        navigate('/admin/orders');
      }
    }
  }, [id, navigate, showToast]);

  const refreshOrder = () => {
    if (!order) return;
    const updated = orderService.getOrderById(order.id);
    if (updated) setOrder(updated);
  };

  // Payment Verification Handler
  const handleVerifyPayment = async (newStatus: 'Verified' | 'Failed') => {
    if (!order) return;
    const res = await orderService.verifyPaymentLive(order.id, newStatus);
    if (!res.success) {
      showToast(res.error || 'Failed to update payment status.', 'error');
      return;
    }
    refreshOrder();
    setFailPaymentModalOpen(false);
    showToast(`Payment marked as ${newStatus}.`, newStatus === 'Verified' ? 'success' : 'warning');
  };

  // Status Progression Handler
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    const res = await orderService.updateOrderStatusLive(order.id, newStatus);
    if (!res.success) {
      showToast(res.error || 'Failed to update order status.', 'error');
      return;
    }
    refreshOrder();
    showToast(`Order status updated to ${newStatus}.`, 'success');
  };

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!order) return;
    if (!cancelReason.trim()) {
      showToast('Please provide a reason for cancellation.', 'error');
      return;
    }
    const res = await orderService.updateOrderStatusLive(order.id, 'Cancelled', 'Admin', cancelReason, cancelReason);
    if (!res.success) {
      showToast(res.error || 'Failed to cancel order.', 'error');
      return;
    }
    refreshOrder();
    setCancelModalOpen(false);
    showToast('Order cancelled and inventory quantities restored to stock.', 'info');
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center p-16">
        <FontAwesomeIcon icon={Icons.spinner} className="h-8 w-8 text-quantum animate-spin" />
      </div>
    );
  }

  const isPendingOld = order.status === 'Pending' && (Date.now() - new Date(order.createdAt).getTime() > 24 * 60 * 60 * 1000);
  const isMobilePayment = order.paymentMethod === 'bKash' || order.paymentMethod === 'Nagad';
  const hasResubmittedPayment = order.paymentStatus === 'Verification pending'
    && (order.history || []).some(
      (entry) => entry.changedBy === 'Customer' && entry.note?.startsWith('Customer resubmitted ')
    );

  return (
    <>
    <InvoicePrint order={order} />
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Action Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/orders" className="caption-3 text-muted hover:text-quantum flex items-center gap-1 font-semibold">
              <FontAwesomeIcon icon={Icons.chevronLeft} className="h-2.5 w-2.5" />
              <span>Back to Orders List</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="heading-5 sm:heading-4 font-bold text-ink flex items-center gap-2">
              <span>Order</span>
              <span className="font-mono text-quantum font-bold">{order.orderNumber}</span>
            </h1>
            {isPendingOld && (
              <span className="caption-4 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">
                &gt;24 Hours Pending
              </span>
            )}
          </div>
          <p className="caption-3 text-muted mt-0.5">
            Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm font-semibold"
          >
            <FontAwesomeIcon icon={Icons.order} className="h-3.5 w-3.5" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Order Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Ordered Items, Totals & Timeline */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card 1: Ordered Items Table */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
            <h2 className="title-2 font-bold text-ink mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.package} className="h-4 w-4 text-quantum" />
              <span>Ordered Items ({order.items.reduce((s, i) => s + i.quantity, 0)})</span>
            </h2>

            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=150&q=80'}
                      alt={item.productName}
                      className="h-14 w-14 rounded-xl object-cover border border-border flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-ink block text-sm">{item.productName}</span>
                      {item.variantName && (
                        <span className="caption-4 px-2 py-0.5 rounded bg-surface-alt border border-border text-slate-700 font-medium inline-block mt-0.5">
                          Variant: {item.variantName}
                        </span>
                      )}
                      <span className="caption-5 text-muted block mt-1">
                        Unit Price: {formatCurrency(item.unitPrice, 'en')} &times; {item.quantity}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="title-3 font-bold text-ink block">
                      {formatCurrency(item.lineTotal, 'en')}
                    </span>
                    <span className="caption-5 text-muted">
                      Qty: <strong>{item.quantity}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal, Delivery & Total Breakdown */}
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">{formatCurrency(order.subtotal, 'en')}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery Charge ({order.area})</span>
                <span className="font-semibold text-ink">{formatCurrency(order.deliveryCharge, 'en')}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-ink pt-2 border-t border-border">
                <span>Final Total</span>
                <span className="text-quantum font-bold text-lg">{formatCurrency(order.total, 'en')}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Order Status & Cancellation History */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
            <h2 className="title-2 font-bold text-ink mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.clock} className="h-4 w-4 text-quantum" />
              <span>Order Lifecycle &amp; History Log</span>
            </h2>

            {order.status === 'Cancelled' && (
              <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-3">
                <FontAwesomeIcon icon={Icons.warning} className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block text-sm">Order Cancelled</span>
                  <p className="caption-3 text-rose-800 mt-0.5">
                    <strong>Reason:</strong> {order.cancellationReason || 'Admin or customer cancelled'}
                  </p>
                  <span className="caption-5 text-rose-700 block mt-1">
                    * Ordered quantities have been automatically restored to product stock.
                  </span>
                </div>
              </div>
            )}

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-5">
              {(order.history || []).map((hist, index) => (
                <div key={hist.id || index} className="relative">
                  <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-quantum border-2 border-white shadow-xs" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="title-4 font-bold text-ink">
                      {hist.toStatus} Stage
                    </span>
                    <span className="caption-5 text-muted">
                      {new Date(hist.changedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="caption-3 text-slate-600 mt-0.5">{hist.note}</p>
                  <span className="caption-5 text-muted block mt-0.5">Updated by: <strong>{hist.changedBy}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Workflow Progression, Customer Info & Payment Verification */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 3: Workflow Action Panel */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col gap-4">
            <div>
              <span className="caption-4 font-semibold uppercase text-muted tracking-wider block mb-1">Current Status</span>
              <div className="flex items-center gap-2">
                <span className={`caption-2 px-3 py-1 rounded-full font-bold ${
                  order.status === 'Cancelled'
                    ? 'bg-rose-100 text-rose-800'
                    : order.status === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.status === 'Shipped'
                    ? 'bg-indigo-100 text-indigo-800'
                    : order.status === 'Confirmed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>

            {/* Allowed Forward Progression Steps */}
            {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <span className="caption-4 font-semibold text-slate-700">Advance Workflow:</span>

                {order.status === 'Pending' && (
                  <div>
                    <button
                      type="button"
                      disabled={isMobilePayment && order.paymentStatus !== 'Verified'}
                      onClick={() => handleStatusChange('Confirmed')}
                      className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm w-full justify-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                    >
                      <FontAwesomeIcon icon={Icons.check} className="h-3.5 w-3.5" />
                      <span>Confirm Order (Call Verified)</span>
                    </button>
                    {isMobilePayment && order.paymentStatus !== 'Verified' && (
                      <p className="caption-5 text-rose-600 mt-1.5 leading-snug">
                        * You must verify the {order.paymentMethod} payment before confirming.
                      </p>
                    )}
                  </div>
                )}

                {order.status === 'Confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('Shipped')}
                    className="btn-base bg-indigo-600 text-white hover:bg-indigo-700 button-sm w-full justify-center font-semibold shadow-2xs"
                  >
                    <FontAwesomeIcon icon={Icons.truck} className="h-3.5 w-3.5" />
                    <span>Mark Handed Over to Courier</span>
                  </button>
                )}

                {order.status === 'Shipped' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('Delivered')}
                    className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 button-sm w-full justify-center font-semibold shadow-2xs"
                  >
                    <FontAwesomeIcon icon={Icons.circleCheck} className="h-3.5 w-3.5" />
                    <span>Mark Successfully Delivered</span>
                  </button>
                )}

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="btn-base bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 button-sm w-full justify-center font-semibold mt-1"
                >
                  <FontAwesomeIcon icon={Icons.close} className="h-3.5 w-3.5" />
                  <span>Cancel Order &amp; Restore Stock</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 4: Payment Verification Panel */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="title-3 font-bold text-ink">Payment Status</h3>
              <span className={`caption-4 px-2.5 py-0.5 rounded-full font-bold ${
                order.paymentStatus === 'Verified'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.paymentStatus === 'Failed'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {order.paymentStatus}
              </span>
            </div>

            {hasResubmittedPayment && (
              <div
                role="status"
                className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"
              >
                Customer resubmitted corrected payment details. Review the latest transaction ID and sender number below.
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-surface-alt border border-border flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Method:</span>
                <span className="font-bold text-ink">{order.paymentMethod}</span>
              </div>

              {isMobilePayment ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">Sender Mobile:</span>
                    <span className="font-mono font-bold text-ink">{order.senderNumber || order.paymentSender || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Transaction ID:</span>
                    <span className="font-mono font-bold text-quantum">{order.trxId || order.paymentTrxId || 'Not provided'}</span>
                  </div>
                </>
              ) : (
                <p className="caption-4 text-slate-600 mt-1">
                  Cash on Delivery: Payment will be collected in cash by courier at doorstep.
                </p>
              )}
            </div>

            {/* Mobile Verification Actions */}
            {isMobilePayment && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <span className="caption-5 font-semibold text-slate-600">Verification Actions:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={order.paymentStatus === 'Verified'}
                    onClick={() => handleVerifyPayment('Verified')}
                    className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 button-xsm flex-1 justify-center font-semibold disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={Icons.check} className="h-3 w-3" />
                    <span>Mark Verified</span>
                  </button>

                  <button
                    type="button"
                    disabled={order.paymentStatus === 'Failed'}
                    onClick={() => setFailPaymentModalOpen(true)}
                    className="btn-base bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 button-xsm flex-1 justify-center font-semibold disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={Icons.close} className="h-3 w-3" />
                    <span>Mark Failed</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Customer & Delivery Address */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col gap-3.5">
            <h3 className="title-3 font-bold text-ink flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.user} className="h-3.5 w-3.5 text-quantum" />
              <span>Customer Details</span>
            </h3>

            <div className="flex flex-col gap-2 text-xs">
              <div>
                <span className="caption-5 text-muted block">Full Name:</span>
                <span className="font-bold text-ink text-sm">{order.customerName}</span>
              </div>

              <div>
                <span className="caption-5 text-muted block">Mobile Phone:</span>
                <a href={`tel:${order.phone}`} className="font-mono font-bold text-quantum hover:underline flex items-center gap-1">
                  <FontAwesomeIcon icon={Icons.phone} className="h-3 w-3" />
                  <span>{order.phone}</span>
                </a>
              </div>

              <div>
                <span className="caption-5 text-muted block">Delivery Area:</span>
                <span className="font-semibold text-ink">{order.area}</span>
              </div>

              <div>
                <span className="caption-5 text-muted block">Full Address:</span>
                <p className="caption-3 text-slate-700 mt-0.5 leading-relaxed bg-surface-alt p-2.5 rounded-lg border border-border">
                  {order.address}
                </p>
              </div>

              {order.note && (
                <div>
                  <span className="caption-5 text-muted block">Customer Order Note:</span>
                  <p className="caption-3 text-slate-700 italic mt-0.5 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                    "{order.note}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title={`Cancel Order ${order.orderNumber}`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4 text-sm">
            <p className="caption-2 text-slate-700 leading-relaxed">
              Cancelling this order will mark it as Cancelled and immediately return all <strong>{order.items.reduce((s, i) => s + i.quantity, 0)} item(s)</strong> back to product stock.
            </p>

            <div>
              <label className="caption-3 font-semibold text-ink block mb-1">
                Cancellation Reason <span className="text-error">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 text-xs text-ink bg-surface mb-2 focus:outline-none focus:border-quantum"
              >
                <option value="Customer requested order cancellation">Customer requested cancellation</option>
                <option value="Customer phone unreachable after 3 attempts">Phone unreachable after 3 attempts</option>
                <option value="Payment verification failed / invalid TrxID">Payment verification failed / invalid TrxID</option>
                <option value="Address outside delivery coverage">Address outside delivery coverage</option>
                <option value="Duplicate order placed by mistake">Duplicate order placed</option>
                <option value="Out of stock / damage detected during dispatch">Damaged item detected during dispatch</option>
              </select>

              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Or specify custom cancellation reason..."
                className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="btn-base bg-rose-600 text-white hover:bg-rose-700 button-sm font-semibold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fail Payment Confirmation Modal */}
      {failPaymentModalOpen && (
        <Modal
          isOpen={failPaymentModalOpen}
          onClose={() => setFailPaymentModalOpen(false)}
          title="Mark Payment as Failed"
          maxWidth="sm"
        >
          <div className="flex flex-col gap-4 text-sm">
            <p className="caption-2 text-slate-700 leading-relaxed">
              Are you sure you want to mark the payment for order <strong>{order.orderNumber}</strong> as Failed? The order will not be eligible for confirmation until a valid payment is verified.
            </p>
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setFailPaymentModalOpen(false)}
                className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerifyPayment('Failed')}
                className="btn-base bg-rose-600 text-white hover:bg-rose-700 button-sm font-semibold"
              >
                Confirm Payment Failed
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </>
  );
};
