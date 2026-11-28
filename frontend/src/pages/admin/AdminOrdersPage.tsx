import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { orderService } from '../../services/orderService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { Icons } from '../../utilities/icons';
import { formatCurrency, formatNumber } from '../../utilities/currency';
import { Modal } from '../../components/Modal';

export const AdminOrdersPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>(() => orderService.getOrders());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick cancel modal
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested order cancellation');

  const { showToast } = useToast();

  const refreshOrders = () => {
    setOrders(orderService.getOrders());
  };

  useEffect(() => {
    const handleUpdate = () => refreshOrders();
    window.addEventListener('quantum_orders_updated', handleUpdate);
    return () => window.removeEventListener('quantum_orders_updated', handleUpdate);
  }, []);

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  // Search & Filter
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status Filter
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Payment Filter
    if (paymentFilter !== 'ALL') {
      result = result.filter(o => o.paymentMethod === paymentFilter);
    }

    // Search by Order Number or Customer Phone
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        o =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.phone.replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, '')) ||
          o.customerName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  // Counts
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const pendingCount = pendingOrders.length;
  const oldPendingCount = pendingOrders.filter(o => new Date(o.createdAt).getTime() < oneDayAgo).length;

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    if (!cancelReason.trim()) {
      showToast('Please specify a cancellation reason.', 'error');
      return;
    }

    const res = await orderService.updateOrderStatusLive(orderToCancel.id, 'Cancelled', 'Admin', cancelReason, cancelReason);
    if (!res.success) {
      showToast(res.error || 'Failed to cancel order.', 'error');
      return;
    }

    refreshOrders();
    setOrderToCancel(null);
    showToast(`Order ${orderToCancel.orderNumber} cancelled. Inventory restored to stock.`, 'info');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="caption-4 font-semibold text-quantum uppercase tracking-wider block mb-1">
            {language === 'bn' ? 'অর্ডার ফুলফিলমেন্ট ও পেমেন্ট যাচাই' : 'Fulfillment & Verification Operations'}
          </span>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">{t.admin.orders.title}</h1>
          <p className="caption-2 text-muted mt-0.5">
            {t.admin.orders.subtitle}
          </p>
        </div>

        {/* Pending Order Count Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="caption-3 font-bold">
              {language === 'bn' 
                ? `${formatNumber(pendingCount, language)} ${t.admin.orders.pendingCount}`
                : `${pendingCount} Pending Order${pendingCount === 1 ? '' : 's'}`}
            </span>
          </div>

          {oldPendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 shadow-2xs">
              <FontAwesomeIcon icon={Icons.warning} className="h-3.5 w-3.5 text-rose-600" />
              <span className="caption-3 font-bold">
                {formatNumber(oldPendingCount, language)} {language === 'bn' ? '>২৪ ঘণ্টার পুরানো' : '>24h Old'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-ink bg-surface focus:outline-none focus:border-quantum"
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            <option value="Pending">Pending ({pendingCount})</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-ink bg-surface focus:outline-none focus:border-quantum"
          >
            <option value="ALL">All Payments</option>
            <option value="COD">Cash on Delivery</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
          </select>
        </div>

        {/* Search by Order Number or Customer Phone */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or customer phone..."
            className="w-full rounded-xl border border-border pl-9 pr-8 py-2 text-xs text-ink focus:outline-none focus:border-quantum"
          />
          <div className="absolute left-3 top-2.5 text-muted">
            <FontAwesomeIcon icon={Icons.search} className="h-3.5 w-3.5" />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-muted hover:text-ink text-xs"
            >
              <FontAwesomeIcon icon={Icons.close} className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr className="caption-3 font-semibold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">{t.admin.orders.colOrderNum}</th>
                <th className="py-3 px-4">{t.admin.orders.colDate}</th>
                <th className="py-3 px-4">{t.admin.orders.colCustomer}</th>
                <th className="py-3 px-4">{t.admin.orders.colPhone}</th>
                <th className="py-3 px-4">{t.admin.orders.colTotal}</th>
                <th className="py-3 px-4">{t.admin.orders.colPayment}</th>
                <th className="py-3 px-4">{t.admin.orders.colPayStatus}</th>
                <th className="py-3 px-4">{t.admin.orders.colOrderStatus}</th>
                <th className="py-3 px-4 text-right">{t.admin.orders.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    <FontAwesomeIcon icon={Icons.order} className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No orders matching your criteria</p>
                    <p className="caption-4 mt-0.5">Try adjusting your filters or clearing the search query.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPendingOld = order.status === 'Pending' && (Date.now() - new Date(order.createdAt).getTime() > oneDayAgo);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-surface-alt/70 transition-colors ${
                        isPendingOld ? 'bg-amber-50/70' : ''
                      }`}
                    >
                      {/* 1. Order Number */}
                      <td className="py-3 px-4 font-mono font-bold text-quantum whitespace-nowrap">
                        <Link to={`/admin/orders/${order.id}`} className="hover:underline flex items-center gap-1.5">
                          <span>{order.orderNumber}</span>
                        </Link>
                        {isPendingOld && (
                          <span className="caption-5 ml-1.5 px-1.5 py-0.2 rounded bg-amber-600 text-white font-sans font-bold text-[10px]">
                            &gt;24h Old
                          </span>
                        )}
                      </td>

                      {/* 2. Order Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                        <span className="block font-medium text-ink">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        <span className="caption-5 text-muted">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* 3. Customer Name */}
                      <td className="py-3 px-4 font-semibold text-ink whitespace-nowrap">
                        {order.customerName}
                      </td>

                      {/* 4. Mobile Number */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        <a href={`tel:${order.phone}`} className="hover:text-quantum hover:underline flex items-center gap-1">
                          <FontAwesomeIcon icon={Icons.phone} className="h-2.5 w-2.5 text-muted" />
                          <span>{order.phone}</span>
                        </a>
                      </td>

                      {/* 5. Total Amount */}
                      <td className="py-3 px-4 font-bold text-ink whitespace-nowrap">
                        {formatCurrency(order.total, 'en')}
                      </td>

                      {/* 6. Payment Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="caption-3 font-semibold text-ink block">{order.paymentMethod}</span>
                        {(order.trxId || order.paymentTrxId) && (
                          <span className="caption-5 font-mono text-quantum block" title="Transaction ID">
                            Trx: {order.trxId || order.paymentTrxId}
                          </span>
                        )}
                      </td>

                      {/* 7. Payment Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`caption-4 px-2 py-0.5 rounded-full font-bold ${
                            order.paymentStatus === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.paymentStatus === 'Failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>

                      {/* 8. Order Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`caption-4 px-2.5 py-0.5 rounded-full font-bold ${
                            order.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : order.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'Shipped'
                              ? 'bg-indigo-100 text-indigo-800'
                              : order.status === 'Confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* 9. Action Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-xsm font-semibold"
                          >
                            <span>Manage</span>
                            <FontAwesomeIcon icon={Icons.chevronRight} className="h-2.5 w-2.5 text-muted ml-0.5" />
                          </Link>

                          {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOrderToCancel(order);
                                setCancelReason('Customer requested cancellation');
                              }}
                              className="btn-base bg-rose-50 text-rose-700 hover:bg-rose-100 button-xsm font-medium"
                              title="Cancel order"
                            >
                              <FontAwesomeIcon icon={Icons.close} className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Modal */}
      {orderToCancel && (
        <Modal
          isOpen={!!orderToCancel}
          onClose={() => setOrderToCancel(null)}
          title={`Cancel Order ${orderToCancel.orderNumber}`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4 text-sm">
            <p className="caption-2 text-slate-700 leading-relaxed">
              Cancelling order <strong>{orderToCancel.orderNumber}</strong> will restore all {orderToCancel.items.reduce((s, i) => s + i.quantity, 0)} item(s) back to inventory.
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
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Phone unreachable after 3 attempts">Phone unreachable after 3 attempts</option>
                <option value="Payment verification failed / invalid TrxID">Payment verification failed / invalid TrxID</option>
                <option value="Address outside delivery coverage">Address outside delivery coverage</option>
                <option value="Duplicate order placed by mistake">Duplicate order placed</option>
              </select>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
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
    </div>
  );
};
