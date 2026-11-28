import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Coupon } from '../../types';
import { promotionService } from '../../services/promotionService';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../../utilities/icons';

export const AdminCouponsPage: React.FC = () => {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [minLifetimeDeliveredItems, setMinLifetimeDeliveredItems] = useState<number | undefined>();
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number>(0);
  const [maximumDiscount, setMaximumDiscount] = useState<number | undefined>(undefined);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [perCustomerLimit, setPerCustomerLimit] = useState<number>(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = () => {
    setCoupons(promotionService.getCoupons());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('quantum_coupons_updated', handleSync);
    return () => window.removeEventListener('quantum_coupons_updated', handleSync);
  }, []);

  const openAddModal = () => {
    setEditingCoupon(null);
    const now = new Date();
    const nextMonth = new Date(Date.now() + 30 * 86400000);
    setCode('');
    setOfferTitle('');
    setMinLifetimeDeliveredItems(undefined);
    setDiscountType('percentage');
    setDiscountValue(10);
    setMinimumOrderValue(1000);
    setMaximumDiscount(500);
    setUsageLimit(100);
    setPerCustomerLimit(1);
    setStartDate(now.toISOString().slice(0, 16));
    setEndDate(nextMonth.toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setOfferTitle(c.offerTitle || '');
    setMinLifetimeDeliveredItems(c.minLifetimeDeliveredItems);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinimumOrderValue(c.minimumOrderValue || 0);
    setMaximumDiscount(c.maximumDiscount);
    setUsageLimit(c.usageLimit);
    setPerCustomerLimit(c.perCustomerLimit || 1);
    setStartDate(c.startDate.slice(0, 16));
    setEndDate(c.endDate.slice(0, 16));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      showToast('Coupon code is required.', 'error');
      return;
    }
    if (Number(discountValue) <= 0) {
      showToast('Discount value must be greater than zero.', 'error');
      return;
    }

    const couponData: Omit<Coupon, 'id' | 'createdAt' | 'usedCount'> = {
      code: code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
      offerTitle: offerTitle.trim() || undefined,
      minLifetimeDeliveredItems: minLifetimeDeliveredItems && minLifetimeDeliveredItems > 0
        ? Number(minLifetimeDeliveredItems)
        : undefined,
      discountType,
      discountValue: Number(discountValue),
      minimumOrderValue: Number(minimumOrderValue) || 0,
      maximumDiscount: maximumDiscount ? Number(maximumDiscount) : undefined,
      usageLimit: Number(usageLimit) || 100,
      perCustomerLimit: Number(perCustomerLimit) || 1,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isActive: true,
    };

    try {
      if (editingCoupon) {
        await promotionService.updateCoupon(editingCoupon.id, couponData);
        showToast('Coupon updated successfully!', 'success');
      } else {
        await promotionService.createCoupon(couponData);
        showToast('Coupon created successfully!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save coupon.', 'error');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (window.confirm(`Delete coupon "${code}"?`)) {
      try {
        await promotionService.deleteCoupon(id);
        showToast('Coupon deleted.', 'info');
        loadData();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to delete coupon.', 'error');
      }
    }
  };

  const handleToggle = async (c: Coupon) => {
    try {
      await promotionService.updateCoupon(c.id, { isActive: !c.isActive });
      showToast(`Coupon ${!c.isActive ? 'activated' : 'paused'}.`, 'success');
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update coupon.', 'error');
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Promotional Coupons & Vouchers</h1>
          <p className="text-sm text-muted mt-1">
            Manage discount voucher codes, customer usage caps, minimum spend rules, and validity dates.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-coupon-btn"
          onClick={openAddModal}
          className="btn-base bg-quantum text-white hover:bg-quantum-hover px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={Icons.plus} className="h-3.5 w-3.5" />
          <span>New Coupon</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-xs max-w-md">
        <div className="relative">
          <FontAwesomeIcon
            icon={Icons.search}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted"
          />
          <input
            type="text"
            placeholder="Search coupon codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border focus:outline-none focus:border-quantum uppercase font-mono"
          />
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-surface-alt border-b border-border text-muted uppercase font-semibold">
              <tr>
                <th className="p-3.5 pl-5">Coupon Code</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Min Spend & Cap</th>
                <th className="p-3.5">Usage / Limit</th>
                <th className="p-3.5">Validity Schedule</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No coupon codes found. Click "New Coupon" to add one.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="font-mono font-bold text-sm text-quantum tracking-wider">{c.code}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-ink">
                      {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `৳${c.discountValue} FLAT OFF`}
                    </td>
                    <td className="p-3.5 text-muted">
                      <div>Min: ৳{c.minimumOrderValue || 0}</div>
                      {c.maximumDiscount && <div>Cap: ৳{c.maximumDiscount}</div>}
                    </td>
                    <td className="p-3.5 font-medium">
                      <span>{c.usedCount} uses</span>
                      <span className="text-muted"> / {c.usageLimit}</span>
                    </td>
                    <td className="p-3.5 text-muted leading-tight">
                      <div>From: {new Date(c.startDate).toLocaleDateString()}</div>
                      <div>To: {new Date(c.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="p-3.5">
                      {c.isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 pr-5 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggle(c)}
                        className={`p-1.5 rounded-lg inline-flex items-center ${
                          c.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={c.isActive ? 'Deactivate Coupon' : 'Activate Coupon'}
                      >
                        <FontAwesomeIcon icon={c.isActive ? Icons.close : Icons.check} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-alt inline-flex items-center"
                        title="Edit Coupon"
                      >
                        <FontAwesomeIcon icon={Icons.edit} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.code)}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error-soft/30 inline-flex items-center"
                        title="Delete Coupon"
                      >
                        <FontAwesomeIcon icon={Icons.trash} className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col my-4">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-ink">
                {editingCoupon ? 'Edit Promotional Coupon' : 'Create New Promotional Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg text-muted hover:text-ink flex items-center justify-center hover:bg-surface-alt"
              >
                <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EID20"
                  className="w-full rounded-xl border border-border px-3 py-2 font-mono uppercase text-ink focus:border-quantum focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Offer Title</label>
                  <input
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Minimum Lifetime Delivered Items</label>
                  <input
                    type="number"
                    min="0"
                    value={minLifetimeDeliveredItems ?? ''}
                    onChange={(e) => setMinLifetimeDeliveredItems(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-surface-alt rounded-xl border border-border">
                <div>
                  <label className="font-semibold text-ink block mb-1">Discount Type *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Deduction (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">
                    {discountType === 'percentage' ? 'Percentage Value (%)' : 'Amount (৳)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Max Discount Cap (৳)</label>
                  <input
                    type="number"
                    value={maximumDiscount || ''}
                    onChange={(e) => setMaximumDiscount(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Min Order Value (৳)</label>
                  <input
                    type="number"
                    value={minimumOrderValue}
                    onChange={(e) => setMinimumOrderValue(Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(Number(e.target.value))}
                    placeholder="100"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Per Customer Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={perCustomerLimit}
                    onChange={(e) => setPerCustomerLimit(Number(e.target.value))}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Valid From *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Valid Until *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-surface text-ink hover:bg-surface-alt font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-quantum text-white hover:bg-quantum-hover font-semibold shadow-sm"
                >
                  {editingCoupon ? 'Update Coupon' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
