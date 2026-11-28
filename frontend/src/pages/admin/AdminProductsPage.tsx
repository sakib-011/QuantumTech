import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { productService } from '../../services/productService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { Icons } from '../../utilities/icons';
import { formatCurrency, formatNumber } from '../../utilities/currency';
import { Modal } from '../../components/Modal';

export const AdminProductsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [products, setProducts] = useState<Product[]>(() => productService.getAllProductsAdmin());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Hidden'>('ALL');
  
  // Quick View Details Modal
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const { showToast } = useToast();
  const categories = productService.getCategories();

  const refreshProducts = () => {
    setProducts(productService.getAllProductsAdmin());
  };

  useEffect(() => {
    const handleUpdate = () => refreshProducts();
    window.addEventListener('quantum_products_updated', handleUpdate);
    return () => window.removeEventListener('quantum_products_updated', handleUpdate);
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) {
        return false;
      }

      // Stock filter
      if (stockFilter === 'LOW_STOCK' && (p.stock > 5 || p.stock === 0)) {
        return false;
      }
      if (stockFilter === 'OUT_OF_STOCK' && p.stock > 0) {
        return false;
      }
      if (stockFilter === 'IN_STOCK' && p.stock <= 5) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // Search query (English or Bangla name, category, or tags)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesNameBn = p.nameBn.toLowerCase().includes(q);
        const matchesCat = (p.categoryName || '').toLowerCase().includes(q);
        const matchesTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchesName && !matchesNameBn && !matchesCat && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [products, categoryFilter, stockFilter, statusFilter, search]);

  // Actions
  const handleToggleHide = async (product: Product) => {
    const updatedStatus = product.status === 'Hidden' ? 'Active' : 'Hidden';
    try {
      await productService.saveProduct({ ...product, status: updatedStatus });
      refreshProducts();
      showToast(
        updatedStatus === 'Active'
          ? `"${product.name}" published to customer catalog.`
          : `"${product.name}" is now hidden from storefront.`,
        'info'
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update product.', 'error');
    }
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"? It will be soft-deleted to preserve order history.`)) {
      try {
        await productService.softDeleteProduct(product.id);
        refreshProducts();
        showToast(`Product "${product.name}" soft-deleted.`, 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to delete product.', 'error');
      }
    }
  };

  // Stats
  const lowStockCount = products.filter(p => p.stock <= 5 && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="caption-4 font-semibold text-quantum uppercase tracking-wider block mb-1">
            {language === 'bn' ? 'ইনভেন্টরি ও ক্যাটালগ ব্যবস্থাপনা' : 'Inventory & Catalog Management'}
          </span>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">{t.admin.products.title}</h1>
          <p className="caption-2 text-muted mt-0.5">
            {t.admin.products.subtitle}
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm font-semibold whitespace-nowrap self-start sm:self-auto"
        >
          <FontAwesomeIcon icon={Icons.plus} className="h-3.5 w-3.5" />
          <span>{t.admin.products.addProduct}</span>
        </Link>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-border shadow-2xs flex items-center justify-between">
          <div>
            <span className="caption-5 text-muted uppercase font-semibold">Total Listed</span>
            <span className="heading-6 font-bold text-ink block mt-0.5">{products.length}</span>
          </div>
          <FontAwesomeIcon icon={Icons.package} className="h-5 w-5 text-slate-400" />
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border shadow-2xs flex items-center justify-between">
          <div>
            <span className="caption-5 text-muted uppercase font-semibold">Active in Store</span>
            <span className="heading-6 font-bold text-emerald-600 block mt-0.5">
              {products.filter(p => p.status === 'Active').length}
            </span>
          </div>
          <FontAwesomeIcon icon={Icons.circleCheck} className="h-5 w-5 text-emerald-400" />
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border shadow-2xs flex items-center justify-between">
          <div>
            <span className="caption-5 text-muted uppercase font-semibold">Low Stock (&le; 5)</span>
            <span className="heading-6 font-bold text-amber-600 block mt-0.5">{lowStockCount}</span>
          </div>
          <FontAwesomeIcon icon={Icons.warning} className="h-5 w-5 text-amber-400" />
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border shadow-2xs flex items-center justify-between">
          <div>
            <span className="caption-5 text-muted uppercase font-semibold">Out of Stock</span>
            <span className="heading-6 font-bold text-rose-600 block mt-0.5">{outOfStockCount}</span>
          </div>
          <FontAwesomeIcon icon={Icons.error} className="h-5 w-5 text-rose-400" />
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by English or Bangla name, category, or tag..."
            className="w-full rounded-xl border border-border px-3.5 py-2 pl-9 text-xs sm:text-sm text-ink focus:outline-none focus:border-quantum focus:ring-1 focus:ring-quantum"
          />
          <div className="absolute left-3 top-2.5 text-muted">
            <FontAwesomeIcon icon={Icons.search} className="h-3.5 w-3.5" />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-muted hover:text-ink text-xs"
            >
              <FontAwesomeIcon icon={Icons.close} className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-border px-3 py-2 text-xs sm:text-sm text-ink bg-surface focus:outline-none focus:border-quantum"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameEn}
            </option>
          ))}
        </select>

        {/* Stock Filter */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as any)}
          className="rounded-xl border border-border px-3 py-2 text-xs sm:text-sm text-ink bg-surface focus:outline-none focus:border-quantum"
        >
          <option value="ALL">All Stock Levels</option>
          <option value="IN_STOCK">In Stock (&gt; 5)</option>
          <option value="LOW_STOCK">Low Stock (&le; 5 units)</option>
          <option value="OUT_OF_STOCK">Out of Stock (0)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-xl border border-border px-3 py-2 text-xs sm:text-sm text-ink bg-surface focus:outline-none focus:border-quantum"
        >
          <option value="ALL">All Status</option>
          <option value="Active">Active Only</option>
          <option value="Hidden">Hidden / Draft</option>
        </select>
      </div>

      {/* Product Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr className="caption-3 font-semibold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock &amp; Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <FontAwesomeIcon icon={Icons.package} className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No products matched your filters</p>
                    <p className="caption-4 mt-0.5">Try clearing your search query or changing category filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock <= 5 && p.stock > 0;
                  const isOut = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-surface-alt/70 transition-colors">
                      {/* Product Thumbnail & Names */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0] || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=150&q=80'}
                            alt={p.name}
                            className="h-12 w-12 rounded-xl object-cover border border-border flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-ink block leading-snug">{p.name}</span>
                            <span className="caption-4 text-muted block truncate">{p.nameBn}</span>
                            {p.tags && p.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.tags.slice(0, 2).map((t, idx) => (
                                  <span key={idx} className="caption-5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="caption-3 px-2.5 py-1 rounded-lg bg-surface-alt border border-border font-medium text-slate-700">
                          {p.categoryName}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-ink block">{formatCurrency(p.price, 'en')}</span>
                        {p.oldPrice && p.oldPrice > p.price && (
                          <span className="caption-5 text-muted line-through block">
                            {formatCurrency(p.oldPrice, 'en')}
                          </span>
                        )}
                      </td>

                      {/* Stock with Low-Stock Indicator */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`caption-4 px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5 ${
                            isOut
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isOut ? (
                            <>
                              <FontAwesomeIcon icon={Icons.error} className="h-3 w-3" />
                              <span>Out of Stock (0)</span>
                            </>
                          ) : isLow ? (
                            <>
                              <FontAwesomeIcon icon={Icons.warning} className="h-3 w-3 text-amber-700" />
                              <span>Low Stock ({p.stock})</span>
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={Icons.circleCheck} className="h-3 w-3 text-emerald-600" />
                              <span>In Stock ({p.stock})</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleHide(p)}
                          className={`caption-4 px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                            p.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                          title={p.status === 'Active' ? 'Click to hide from store' : 'Click to publish to store'}
                        >
                          <FontAwesomeIcon icon={p.status === 'Active' ? Icons.eye : Icons.eyeSlash} className="h-3 w-3" />
                          <span>{p.status === 'Active' ? 'Active' : 'Hidden'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setViewProduct(p)}
                            className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-xsm"
                            title="Quick view product specs & details"
                          >
                            <FontAwesomeIcon icon={Icons.eye} className="h-3 w-3" />
                          </button>

                          {/* Edit Product */}
                          <Link
                            to={`/admin/products/${p.id}/edit`}
                            className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-xsm font-semibold"
                            title="Edit full product details"
                          >
                            Edit
                          </Link>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="btn-base bg-error-soft text-error hover:bg-error hover:text-white button-xsm"
                            title="Soft delete product"
                          >
                            <FontAwesomeIcon icon={Icons.trash} className="h-3 w-3" />
                          </button>
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

      {/* Quick View Product Details Modal */}
      {viewProduct && (
        <Modal
          isOpen={!!viewProduct}
          onClose={() => setViewProduct(null)}
          title={viewProduct.name}
          maxWidth="lg"
        >
          <div className="flex flex-col gap-6 text-sm">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={viewProduct.images[0] || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80'}
                alt={viewProduct.name}
                className="h-32 w-32 rounded-2xl object-cover border border-border flex-shrink-0"
              />
              <div className="flex-1">
                <span className="caption-3 px-2 py-0.5 rounded bg-quantum-soft text-quantum font-bold uppercase mb-1 inline-block">
                  {viewProduct.categoryName}
                </span>
                <h3 className="heading-6 font-bold text-ink">{viewProduct.name}</h3>
                <p className="caption-3 text-muted mb-2">{viewProduct.nameBn}</p>
                <div className="flex items-center gap-3">
                  <span className="title-2 font-bold text-ink">{formatCurrency(viewProduct.price, 'en')}</span>
                  <span className="caption-4 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    Stock: {viewProduct.stock} units
                  </span>
                  <span className={`caption-4 px-2 py-0.5 rounded-full font-bold ${
                    viewProduct.status === 'Active' ? 'bg-success-soft text-success' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {viewProduct.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {viewProduct.images.length > 1 && (
              <div>
                <span className="caption-4 font-semibold text-muted block mb-2">Gallery Images ({viewProduct.images.length}):</span>
                <div className="flex flex-wrap gap-2">
                  {viewProduct.images.map((img, i) => (
                    <img key={i} src={img} alt={`Gallery ${i}`} className="h-14 w-14 rounded-lg object-cover border border-border" />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
              <span className="caption-4 font-semibold text-slate-700 block mb-1">Description:</span>
              <p className="caption-3 text-slate-600 leading-relaxed">{viewProduct.description}</p>
            </div>

            {/* Specifications */}
            {viewProduct.specifications && Object.keys(viewProduct.specifications).length > 0 && (
              <div>
                <span className="caption-4 font-semibold text-muted block mb-2">Specifications:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(viewProduct.specifications).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg bg-surface border border-border flex justify-between">
                      <span className="text-muted font-medium">{k}:</span>
                      <span className="font-semibold text-ink">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variants */}
            {viewProduct.variants && viewProduct.variants.length > 0 && (
              <div>
                <span className="caption-4 font-semibold text-muted block mb-2">Configured Variants:</span>
                <div className="flex flex-wrap gap-2">
                  {viewProduct.variants.map((v) => (
                    <span key={v.id} className="caption-3 px-2.5 py-1 rounded-lg bg-surface border border-border font-medium text-ink">
                      {v.value} • {formatCurrency(v.price, 'en')} • Stock: {v.stock}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <Link
                to={`/product/${viewProduct.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm"
              >
                <FontAwesomeIcon icon={Icons.external} className="h-3 w-3 text-quantum" />
                <span>View on Storefront</span>
              </Link>
              <Link
                to={`/admin/products/${viewProduct.id}/edit`}
                className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm font-semibold"
              >
                Edit Product
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
