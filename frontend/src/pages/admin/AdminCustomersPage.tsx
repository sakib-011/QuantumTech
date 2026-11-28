import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  AdminCustomerOrder,
  AdminCustomerSummary,
  adminCustomerService,
} from '../../services/adminCustomerService';
import { formatCurrency, formatNumber } from '../../utilities/currency';
import { Icons } from '../../utilities/icons';

type CustomerAction = 'block' | 'unblock' | 'delete';

export const AdminCustomersPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerSummary | null>(null);
  const [customerOrders, setCustomerOrders] = useState<AdminCustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    customer: AdminCustomerSummary;
    action: CustomerAction;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setCustomers(await adminCustomerService.list());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load customers.';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [customers, search]);

  const openOrderHistory = async (customer: AdminCustomerSummary) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setOrdersLoading(true);
    try {
      setCustomerOrders(await adminCustomerService.getOrders(customer.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load customer orders.';
      showToast(message, 'error');
    } finally {
      setOrdersLoading(false);
    }
  };

  const confirmCustomerAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      const { customer, action } = pendingAction;
      if (action === 'delete') {
        await adminCustomerService.delete(customer.id);
        setCustomers((current) => current.filter((entry) => entry.id !== customer.id));
        setSelectedCustomer((current) => current?.id === customer.id ? null : current);
        showToast(
          language === 'bn' ? 'গ্রাহক অ্যাকাউন্ট মুছে ফেলা হয়েছে।' : 'Customer account deleted.',
          'success'
        );
      } else {
        const blocked = action === 'block';
        await adminCustomerService.setBlocked(customer.id, blocked);
        setCustomers((current) => current.map((entry) =>
          entry.id === customer.id ? { ...entry, blocked } : entry
        ));
        setSelectedCustomer((current) => current?.id === customer.id
          ? { ...current, blocked }
          : current
        );
        showToast(
          blocked
            ? (language === 'bn' ? 'গ্রাহক অ্যাকাউন্ট ব্লক করা হয়েছে।' : 'Customer account blocked.')
            : (language === 'bn' ? 'গ্রাহক অ্যাকাউন্ট আনব্লক করা হয়েছে।' : 'Customer account unblocked.'),
          'success'
        );
      }
      setPendingAction(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Could not update this customer account.',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-BD', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
  };

  const totalOrders = customers.reduce((sum, customer) => sum + customer.orderCount, 0);
  const deliveredOrders = customers.reduce((sum, customer) => sum + customer.deliveredOrderCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="caption-4 font-semibold text-quantum uppercase tracking-wider block mb-1">
            {language === 'bn' ? 'গ্রাহক অ্যাকাউন্ট' : 'Registered accounts'}
          </span>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">{t.admin.nav.customers}</h1>
          <p className="caption-2 text-muted mt-0.5">
            {language === 'bn'
              ? 'নিবন্ধিত গ্রাহক এবং তাদের অ্যাকাউন্ট-সংযুক্ত অর্ডার দেখুন।'
              : 'View registered customers and orders placed while signed in.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCustomers()}
          disabled={loading}
          className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-md self-start disabled:opacity-60"
        >
          <FontAwesomeIcon icon={Icons.refresh} className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-surface border border-border p-4 shadow-xs">
          <span className="caption-4 uppercase tracking-wider text-muted">
            {language === 'bn' ? 'নিবন্ধিত গ্রাহক' : 'Registered customers'}
          </span>
          <strong className="block mt-2 heading-4 text-ink">{formatNumber(customers.length, language)}</strong>
        </div>
        <div className="rounded-2xl bg-surface border border-border p-4 shadow-xs">
          <span className="caption-4 uppercase tracking-wider text-muted">
            {language === 'bn' ? 'অ্যাকাউন্টের অর্ডার' : 'Account orders'}
          </span>
          <strong className="block mt-2 heading-4 text-ink">{formatNumber(totalOrders, language)}</strong>
        </div>
        <div className="rounded-2xl bg-surface border border-border p-4 shadow-xs">
          <span className="caption-4 uppercase tracking-wider text-muted">
            {language === 'bn' ? 'ডেলিভারিকৃত অর্ডার' : 'Delivered orders'}
          </span>
          <strong className="block mt-2 heading-4 text-emerald-600">{formatNumber(deliveredOrders, language)}</strong>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="title-3 font-bold text-ink">
            {language === 'bn' ? 'গ্রাহক তালিকা' : 'Customer directory'}
            <span className="ml-2 caption-4 text-muted font-normal">
              ({formatNumber(filteredCustomers.length, language)})
            </span>
          </h2>
          <div className="relative w-full sm:max-w-sm">
            <FontAwesomeIcon icon={Icons.search} className="absolute left-3 top-3 h-3.5 w-3.5 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={language === 'bn' ? 'নাম, ইমেইল বা ফোন দিয়ে খুঁজুন' : 'Search name, email or phone'}
              className="w-full rounded-xl border border-border pl-9 pr-3 py-2.5 text-sm text-ink focus:outline-none focus:border-quantum"
            />
          </div>
        </div>

        {loadError && (
          <div className="m-4 p-4 rounded-xl border border-error/30 bg-error-soft/20 text-sm text-error flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button type="button" onClick={() => void loadCustomers()} className="font-semibold underline">
              {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try again'}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt text-muted caption-4 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">{language === 'bn' ? 'গ্রাহক' : 'Customer'}</th>
                <th className="px-4 py-3 font-semibold">{language === 'bn' ? 'ফোন' : 'Phone'}</th>
                <th className="px-4 py-3 font-semibold">{language === 'bn' ? 'নিবন্ধিত' : 'Registered'}</th>
                <th className="px-4 py-3 font-semibold">{language === 'bn' ? 'অর্ডার' : 'Orders'}</th>
                <th className="px-4 py-3 font-semibold">{language === 'bn' ? 'সর্বশেষ অর্ডার' : 'Last order'}</th>
                <th className="px-4 py-3 font-semibold text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    <FontAwesomeIcon icon={Icons.spinner} className="animate-spin mr-2" />
                    {language === 'bn' ? 'গ্রাহক লোড হচ্ছে...' : 'Loading customers...'}
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    {search
                      ? (language === 'bn' ? 'কোনো গ্রাহক পাওয়া যায়নি।' : 'No customers match your search.')
                      : (language === 'bn' ? 'এখনও কোনো গ্রাহক নিবন্ধন করেননি।' : 'No customer accounts have registered yet.')}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-alt/60">
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => void openOrderHistory(customer)}
                        className="block text-left font-semibold text-ink hover:text-quantum hover:underline"
                      >
                        {customer.name}
                      </button>
                      <span className="text-xs text-muted">{customer.email}</span>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        customer.blocked
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {customer.blocked
                          ? (language === 'bn' ? 'ব্লক করা' : 'Blocked')
                          : (language === 'bn' ? 'সক্রিয়' : 'Active')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink">{customer.phone}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-muted">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-ink">{formatNumber(customer.orderCount, language)}</span>
                      <span className="block text-xs text-muted">
                        {formatNumber(customer.deliveredOrderCount, language)} {language === 'bn' ? 'ডেলিভারি' : 'delivered'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-muted">{formatDate(customer.lastOrderAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openOrderHistory(customer)}
                          className="btn-base bg-quantum-soft text-quantum hover:bg-quantum hover:text-white button-sm"
                        >
                          <FontAwesomeIcon icon={Icons.user} className="h-3 w-3" />
                          <span>{language === 'bn' ? 'বিস্তারিত' : 'Details'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingAction({
                            customer,
                            action: customer.blocked ? 'unblock' : 'block',
                          })}
                          className={`btn-base button-sm ${
                            customer.blocked
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          <FontAwesomeIcon icon={customer.blocked ? Icons.check : Icons.lock} className="h-3 w-3" />
                          <span>{customer.blocked
                            ? (language === 'bn' ? 'আনব্লক' : 'Unblock')
                            : (language === 'bn' ? 'ব্লক' : 'Block')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingAction({ customer, action: 'delete' })}
                          className="btn-base bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 button-sm"
                        >
                          <FontAwesomeIcon icon={Icons.trash} className="h-3 w-3" />
                          <span>{language === 'bn' ? 'মুছুন' : 'Delete'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={selectedCustomer !== null}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || (language === 'bn' ? 'অর্ডার ইতিহাস' : 'Customer order history')}
        maxWidth="2xl"
      >
        {selectedCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-surface-alt border border-border text-sm">
              <div>
                <span className="caption-4 text-muted block">Email</span>
                <span className="font-medium text-ink break-all">{selectedCustomer.email}</span>
              </div>
              <div>
                <span className="caption-4 text-muted block">{language === 'bn' ? 'ফোন' : 'Phone'}</span>
                <span className="font-medium text-ink">{selectedCustomer.phone}</span>
              </div>
              <div>
                <span className="caption-4 text-muted block">{language === 'bn' ? 'নিবন্ধিত' : 'Registered'}</span>
                <span className="font-medium text-ink">{formatDate(selectedCustomer.createdAt)}</span>
              </div>
              <div>
                <span className="caption-4 text-muted block">{language === 'bn' ? 'অ্যাকাউন্টের অবস্থা' : 'Account status'}</span>
                <span className={`font-semibold ${selectedCustomer.blocked ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {selectedCustomer.blocked
                    ? (language === 'bn' ? 'ব্লক করা' : 'Blocked')
                    : (language === 'bn' ? 'সক্রিয়' : 'Active')}
                </span>
              </div>
              <div>
                <span className="caption-4 text-muted block">{language === 'bn' ? 'সর্বশেষ অর্ডার' : 'Last order'}</span>
                <span className="font-medium text-ink">{formatDate(selectedCustomer.lastOrderAt)}</span>
              </div>
              <div>
                <span className="caption-4 text-muted block">{language === 'bn' ? 'ডেলিভারি এলাকা' : 'Delivery area'}</span>
                <span className="font-medium text-ink">
                  {selectedCustomer.deliveryArea || '—'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="caption-4 text-muted block">{language === 'bn' ? 'সম্পূর্ণ ঠিকানা' : 'Delivery address'}</span>
                <span className="font-medium text-ink whitespace-pre-wrap">
                  {selectedCustomer.address || (language === 'bn' ? 'ঠিকানা সংরক্ষিত নেই' : 'No address saved')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="caption-4 text-muted block">{language === 'bn' ? 'মোট অর্ডার' : 'Total orders'}</span>
                <strong className="mt-1 block text-lg text-ink">
                  {formatNumber(selectedCustomer.orderCount, language)}
                </strong>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="caption-4 text-muted block">{language === 'bn' ? 'ডেলিভারিকৃত' : 'Delivered'}</span>
                <strong className="mt-1 block text-lg text-emerald-600">
                  {formatNumber(selectedCustomer.deliveredOrderCount, language)}
                </strong>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="caption-4 text-muted block">{language === 'bn' ? 'ডেলিভারি রেভিনিউ' : 'Delivered revenue'}</span>
                <strong className="mt-1 block text-lg text-ink">
                  {formatCurrency(selectedCustomer.deliveredRevenue, language)}
                </strong>
              </div>
            </div>

            <div>
              <h3 className="title-3 font-bold text-ink mb-3">
                {language === 'bn' ? 'অ্যাকাউন্টের অর্ডার' : 'Orders placed while signed in'}
              </h3>
              {ordersLoading ? (
                <div className="py-8 text-center text-muted">
                  <FontAwesomeIcon icon={Icons.spinner} className="animate-spin mr-2" />
                  {language === 'bn' ? 'অর্ডার লোড হচ্ছে...' : 'Loading orders...'}
                </div>
              ) : customerOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  {language === 'bn' ? 'এই অ্যাকাউন্টে কোনো অর্ডার যুক্ত নেই।' : 'No orders are linked to this account.'}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-surface-alt text-muted caption-4 uppercase">
                      <tr>
                        <th className="px-3 py-2.5">{language === 'bn' ? 'অর্ডার' : 'Order'}</th>
                        <th className="px-3 py-2.5">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                        <th className="px-3 py-2.5">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                        <th className="px-3 py-2.5 text-right">{language === 'bn' ? 'মোট' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {customerOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-3 py-3">
                            <Link to={`/admin/orders/${order.id}`} onClick={() => setSelectedCustomer(null)} className="font-semibold text-quantum hover:underline">
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-muted">{formatDate(order.createdAt)}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink">{order.status}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-ink">
                            {formatCurrency(order.total, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={pendingAction !== null}
        onClose={() => {
          if (!actionLoading) setPendingAction(null);
        }}
        title={pendingAction?.action === 'delete'
          ? (language === 'bn' ? 'গ্রাহক অ্যাকাউন্ট মুছবেন?' : 'Delete customer account?')
          : pendingAction?.action === 'block'
          ? (language === 'bn' ? 'গ্রাহককে ব্লক করবেন?' : 'Block customer?')
          : (language === 'bn' ? 'গ্রাহককে আনব্লক করবেন?' : 'Unblock customer?')}
        maxWidth="md"
      >
        {pendingAction && (
          <div className="space-y-5">
            <p className="text-sm text-muted">
              {pendingAction.action === 'delete'
                ? (language === 'bn'
                  ? `${pendingAction.customer.name}-এর অ্যাকাউন্ট স্থায়ীভাবে মুছে যাবে। আগের অর্ডারগুলো অর্ডার তালিকায় থাকবে, তবে এই অ্যাকাউন্টের সাথে যুক্ত থাকবে না।`
                  : `${pendingAction.customer.name}'s account will be permanently deleted. Existing orders will remain in admin order history but will no longer be linked to this customer account.`)
                : pendingAction.action === 'block'
                ? (language === 'bn'
                  ? `${pendingAction.customer.name} সাইন ইন বা গ্রাহক অ্যাকাউন্ট ব্যবহার করতে পারবেন না। বিদ্যমান অর্ডার সংরক্ষিত থাকবে।`
                  : `${pendingAction.customer.name} will no longer be able to sign in or use customer account features. Existing orders will be kept.`)
                : (language === 'bn'
                  ? `${pendingAction.customer.name} আবার সাইন ইন ও গ্রাহক অ্যাকাউন্ট ব্যবহার করতে পারবেন।`
                  : `${pendingAction.customer.name} will be able to sign in and use customer account features again.`)}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={actionLoading}
                className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-md disabled:opacity-60"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void confirmCustomerAction()}
                disabled={actionLoading}
                className={`btn-base button-md text-white disabled:opacity-60 ${
                  pendingAction.action === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : pendingAction.action === 'block'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading && <FontAwesomeIcon icon={Icons.spinner} className="h-3.5 w-3.5 animate-spin" />}
                <span>{pendingAction.action === 'delete'
                  ? (language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Delete permanently')
                  : pendingAction.action === 'block'
                  ? (language === 'bn' ? 'ব্লক করুন' : 'Block customer')
                  : (language === 'bn' ? 'আনব্লক করুন' : 'Unblock customer')}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
