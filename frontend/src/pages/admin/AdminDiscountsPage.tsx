import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ProductDiscount, DiscountType, DiscountProductItem } from '../../types';
import { promotionService } from '../../services/promotionService';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../../utilities/icons';

export const AdminDiscountsPage: React.FC = () => {
  const { showToast } = useToast();
  const [discounts, setDiscounts] = useState<ProductDiscount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<ProductDiscount | null>(null);

  // Products and Categories
  const products = productService.getAllProductsAdmin();
  const categories = categoryService.getAdminCategories();

  // Form states
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<number>(10);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Sample Product for Live Price Calculation Preview
  const [previewProductId, setPreviewProductId] = useState<string>('');

  const loadData = () => {
    setDiscounts(promotionService.getDiscounts());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('quantum_discounts_updated', handleSync);
    return () => window.removeEventListener('quantum_discounts_updated', handleSync);
  }, []);

  const openAddModal = () => {
    setEditingDiscount(null);
    const now = new Date();
    const nextWeek = new Date(Date.now() + 14 * 86400000);
    setName('');
    setDiscountType('percentage');
    setDiscountValue(15);
    setMaxDiscountAmount(undefined);
    setStartDate(now.toISOString().slice(0, 16));
    setEndDate(nextWeek.toISOString().slice(0, 16));
    setPriority(10);
    setSelectedProductIds([]);
    setSelectedCategoryIds([]);
    setProductSearch('');
    if (products.length > 0) {
      setPreviewProductId(products[0].id);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (d: ProductDiscount) => {
    setEditingDiscount(d);
    setName(d.name);
    setDiscountType(d.discountType);
    setDiscountValue(d.discountValue);
    setMaxDiscountAmount(d.maxDiscountAmount);
    setStartDate(d.startDate.slice(0, 16));
    setEndDate(d.endDate.slice(0, 16));
    setPriority(d.priority);
    const prodIds = d.productItems.map((pi) => pi.productId);
    setSelectedProductIds(prodIds);
    setSelectedCategoryIds(d.categoryIds || []);
    setProductSearch('');
    if (prodIds.length > 0) {
      setPreviewProductId(prodIds[0]);
    } else if (products.length > 0) {
      setPreviewProductId(products[0].id);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Discount rule name is required.', 'error');
      return;
    }
    if (Number(discountValue) <= 0) {
      showToast('Discount value must be greater than zero.', 'error');
      return;
    }
    if (selectedProductIds.length === 0 && selectedCategoryIds.length === 0) {
      showToast('Please select at least one product or category for this discount.', 'error');
      return;
    }

    const items: DiscountProductItem[] = selectedProductIds.map((pId) => ({
      productId: pId,
      customDiscountType: discountType as any,
      customDiscountValue: Number(discountValue),
    }));

    const targetType = selectedCategoryIds.length > 0 && selectedProductIds.length === 0 ? 'category' : 'specific_products';

    const discountData: Omit<ProductDiscount, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      discountType,
      discountValue: Number(discountValue),
      targetType,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      productItems: items,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      priority: Number(priority) || 1,
      isActive: true,
    };

    try {
      if (editingDiscount) {
        await promotionService.updateDiscount(editingDiscount.id, discountData);
        showToast('Discount updated successfully!', 'success');
      } else {
        await promotionService.createDiscount(discountData);
        showToast('Discount created successfully!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save discount.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete discount rule "${name}"?`)) {
      try {
        await promotionService.deleteDiscount(id);
        showToast('Discount deleted.', 'info');
        loadData();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to delete discount.', 'error');
      }
    }
  };

  const handleToggle = async (d: ProductDiscount) => {
    try {
      await promotionService.updateDiscount(d.id, { isActive: !d.isActive });
      showToast(`Discount ${!d.isActive ? 'activated' : 'paused'}.`, 'success');
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update discount.', 'error');
    }
  };

  // Preview Calculations
  const previewProduct = products.find((p) => p.id === previewProductId) || products[0];
  let calculatedPreviewPrice = previewProduct?.price || 0;
  let calculatedSavings = 0;

  if (previewProduct) {
    if (discountType === 'percentage') {
      calculatedSavings = Math.round((previewProduct.price * discountValue) / 100);
      if (maxDiscountAmount && calculatedSavings > maxDiscountAmount) {
        calculatedSavings = maxDiscountAmount;
      }
      calculatedPreviewPrice = Math.max(0, previewProduct.price - calculatedSavings);
    } else if (discountType === 'fixed') {
      calculatedSavings = Math.min(previewProduct.price, discountValue);
      calculatedPreviewPrice = Math.max(0, previewProduct.price - calculatedSavings);
    } else if (discountType === 'sale_price') {
      calculatedPreviewPrice = Math.min(previewProduct.price, discountValue);
      calculatedSavings = Math.max(0, previewProduct.price - calculatedPreviewPrice);
    }
  }

  const filteredDiscounts = discounts.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Product Discounts & Price Rules</h1>
          <p className="text-sm text-muted mt-1">
            Configure percentage cuts, fixed deductions, flash sale prices, and variant-specific discounts.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-discount-btn"
          onClick={openAddModal}
          className="btn-base bg-quantum text-white hover:bg-quantum-hover px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={Icons.plus} className="h-3.5 w-3.5" />
          <span>New Discount</span>
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
            placeholder="Search discount rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border focus:outline-none focus:border-quantum"
          />
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-surface-alt border-b border-border text-muted uppercase font-semibold">
              <tr>
                <th className="p-3.5 pl-5">Rule Name</th>
                <th className="p-3.5">Type & Value</th>
                <th className="p-3.5">Scope</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Schedule</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No discount rules found.
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="font-semibold text-ink text-sm">{d.name}</div>
                    </td>
                    <td className="p-3.5 font-medium">
                      {d.discountType === 'percentage' && `${d.discountValue}% OFF`}
                      {d.discountType === 'fixed' && `৳${d.discountValue} OFF`}
                      {d.discountType === 'sale_price' && `Special ৳${d.discountValue}`}
                      {d.discountType === 'variant_specific' && 'Variant Overrides'}
                      {d.maxDiscountAmount && (
                        <div className="text-[10px] text-muted">Cap: ৳{d.maxDiscountAmount}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-muted">
                      <div>{d.productItems?.length || 0} products</div>
                      <div>{d.categoryIds?.length || 0} categories</div>
                    </td>
                    <td className="p-3.5 font-medium">{d.priority}</td>
                    <td className="p-3.5 text-muted leading-tight">
                      <div>From: {new Date(d.startDate).toLocaleDateString()}</div>
                      <div>To: {new Date(d.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="p-3.5">
                      {d.isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 pr-5 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggle(d)}
                        className={`p-1.5 rounded-lg inline-flex items-center ${
                          d.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={d.isActive ? 'Pause Rule' : 'Activate Rule'}
                      >
                        <FontAwesomeIcon icon={d.isActive ? Icons.close : Icons.check} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(d)}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-alt inline-flex items-center"
                        title="Edit Rule"
                      >
                        <FontAwesomeIcon icon={Icons.edit} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id, d.name)}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error-soft/30 inline-flex items-center"
                        title="Delete Rule"
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

      {/* Modal with Live Price Calculation Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-4xl shadow-2xl max-h-[92vh] flex flex-col my-4">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-ink">
                {editingDiscount ? 'Edit Discount Rule' : 'Create Product Discount Rule'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg text-muted hover:text-ink flex items-center justify-center hover:bg-surface-alt"
              >
                <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">Discount Rule Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 20% Off Fast Chargers"
                  className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                />
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-surface-alt rounded-xl border border-border">
                <div>
                  <label className="font-semibold text-ink block mb-1">Discount Method *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Deduction Amount (৳)</option>
                    <option value="sale_price">Direct Sale Price (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">
                    {discountType === 'percentage'
                      ? 'Discount Percentage (%)'
                      : discountType === 'fixed'
                      ? 'Deduction Amount (৳)'
                      : 'Sale Price (৳)'}{' '}
                    *
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
                  <label className="font-semibold text-ink block mb-1">Max Cap Amount (৳ Optional)</label>
                  <input
                    type="number"
                    value={maxDiscountAmount || ''}
                    onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Price Calculation Preview Card */}
              {previewProduct && (
                <div className="p-4 rounded-xl bg-quantum-soft/20 border border-quantum/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-quantum block text-[11px] uppercase tracking-wider">
                      Live Price Calculation Preview
                    </span>
                    <span className="text-xs text-ink font-semibold mt-0.5 block">{previewProduct.name}</span>
                    <span className="text-xs text-muted">
                      Original Price: <del>৳{previewProduct.price}</del>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted block">Discounted Customer Price:</span>
                    <span className="text-lg font-bold text-emerald-600 block">
                      ৳{calculatedPreviewPrice}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Customer saves ৳{calculatedSavings}!
                    </span>
                  </div>
                </div>
              )}

              {/* Schedule and Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">End Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Priority (Higher Wins)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              {/* Target Categories */}
              <div>
                <label className="font-semibold text-ink block mb-1">Apply to Whole Categories (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== cat.id));
                          } else {
                            setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-quantum text-white border-quantum'
                            : 'bg-surface text-ink border-border hover:bg-surface-alt'
                        }`}
                      >
                        {cat.nameEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Products Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-ink">Apply to Specific Products</label>
                  <span className="text-[11px] text-muted">{selectedProductIds.length} selected</span>
                </div>
                <input
                  type="text"
                  placeholder="Filter product list..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-1.5 text-xs text-ink mb-2 focus:border-quantum focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-surface">
                  {products
                    .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .map((prod) => {
                      const isSelected = selectedProductIds.includes(prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedProductIds(selectedProductIds.filter((id) => id !== prod.id));
                            } else {
                              setSelectedProductIds([...selectedProductIds, prod.id]);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-surface-alt/80 transition-colors ${
                            isSelected ? 'bg-quantum-soft/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-border text-quantum focus:ring-quantum pointer-events-none"
                            />
                            <span className="font-medium text-ink">{prod.name}</span>
                          </div>
                          <span className="text-muted font-mono">৳{prod.price}</span>
                        </div>
                      );
                    })}
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
                  {editingDiscount ? 'Update Rule' : 'Save Discount Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
