import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { categoryService } from '../../services/categoryService';
import { useToast } from '../../context/ToastContext';
import { Category } from '../../types';
import { Icons } from '../../utilities/icons';
import { Modal } from '../../components/Modal';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(() => categoryService.getAdminCategories());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [iconName, setIconName] = useState('category');

  const { showToast } = useToast();

  useEffect(() => {
    const handleSync = () => {
      setCategories(categoryService.getAdminCategories());
    };
    window.addEventListener('quantum_categories_updated', handleSync);
    return () => window.removeEventListener('quantum_categories_updated', handleSync);
  }, []);

  const handleOpenAdd = () => {
    setEditingCat(null);
    setNameEn('');
    setNameBn('');
    setIconName('category');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setNameEn(cat.nameEn);
    setNameBn(cat.nameBn);
    setIconName(cat.iconName);
    setIsModalOpen(true);
  };

  const handleToggleVisibility = async (cat: Category) => {
    const updatedStatus = cat.status === 'Visible' ? 'Hidden' : 'Visible';
    try {
      await categoryService.updateCategory(cat.id, { status: updatedStatus });
      showToast(`Category "${cat.nameEn}" is now ${updatedStatus}.`, 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update category.', 'error');
    }
  };

  // Move Category Up
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    try {
      await categoryService.reorderCategories(updated);
      showToast(`Moved "${categories[index].nameEn}" up.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to reorder categories.', 'error');
    }
  };

  // Move Category Down
  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    try {
      await categoryService.reorderCategories(updated);
      showToast(`Moved "${categories[index].nameEn}" down.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to reorder categories.', 'error');
    }
  };

  const handleDelete = async (cat: Category) => {
    try {
      const res = await categoryService.deleteCategory(cat.id);
      if (!res.success) {
        showToast(res.error || 'Cannot delete category.', 'error');
        return;
      }
      showToast(`Category "${cat.nameEn}" deleted successfully.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete category.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameBn.trim()) {
      showToast('Please provide both English and Bangla category names.', 'error');
      return;
    }

    try {
      if (editingCat) {
        await categoryService.updateCategory(editingCat.id, {
          nameEn: nameEn.trim(),
          nameBn: nameBn.trim(),
          iconName,
        });
        showToast(`Category "${nameEn}" updated successfully.`, 'success');
      } else {
        await categoryService.createCategory({
          nameEn: nameEn.trim(),
          nameBn: nameBn.trim(),
          slug: nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          sortOrder: categories.length + 1,
          status: 'Visible',
          iconName,
        });
        setCategories(categoryService.getAdminCategories());
        showToast(`Category "${nameEn}" created successfully.`, 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save category.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="caption-4 font-semibold text-quantum uppercase tracking-wider block mb-1">
            Store Taxonomy &amp; Navigation
          </span>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">Category Management</h1>
          <p className="caption-2 text-muted mt-0.5">
            Organize catalog categories in English and Bangla, control ordering and visibility
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm font-semibold whitespace-nowrap self-start sm:self-auto"
        >
          <FontAwesomeIcon icon={Icons.plus} className="h-3.5 w-3.5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr className="caption-3 font-semibold text-muted uppercase tracking-wider">
                <th className="py-3 px-4 w-20 text-center">Order</th>
                <th className="py-3 px-4">Category Name (EN / BN)</th>
                <th className="py-3 px-4">Slug Identifier</th>
                <th className="py-3 px-4">Assigned Products</th>
                <th className="py-3 px-4">Visibility</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat, idx) => {
                const count = cat.productCount || 0;

                return (
                  <tr key={cat.id} className="hover:bg-surface-alt/70 transition-colors">
                    {/* Reorder Buttons (Move Up / Down) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="p-1 rounded text-slate-400 hover:text-quantum disabled:opacity-30 disabled:hover:text-slate-400"
                          title="Move Up"
                        >
                          <FontAwesomeIcon icon={Icons.chevronUp} className="h-3 w-3" />
                        </button>
                        <span className="caption-4 font-mono font-bold text-muted w-4 text-center">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={idx === categories.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="p-1 rounded text-slate-400 hover:text-quantum disabled:opacity-30 disabled:hover:text-slate-400"
                          title="Move Down"
                        >
                          <FontAwesomeIcon icon={Icons.chevronDown} className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* Name EN & BN */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-ink block">{cat.nameEn}</span>
                      <span className="caption-4 text-muted">{cat.nameBn}</span>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4 font-mono text-xs text-quantum">
                      {cat.slug}
                    </td>

                    {/* Assigned Products Count */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="caption-3 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                        {count} product{count === 1 ? '' : 's'}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(cat)}
                        className={`caption-4 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 transition-colors ${
                          cat.status === 'Visible'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                        title={cat.status === 'Visible' ? 'Click to hide category' : 'Click to make category visible'}
                      >
                        <FontAwesomeIcon icon={cat.status === 'Visible' ? Icons.eye : Icons.eyeSlash} className="h-3 w-3" />
                        <span>{cat.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-xsm font-semibold"
                        >
                          Rename / Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className={`btn-base button-xsm ${
                            count > 0
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                              : 'bg-error-soft text-error hover:bg-error hover:text-white'
                          }`}
                          title={count > 0 ? `Cannot delete: contains ${count} product(s)` : 'Delete category'}
                        >
                          <FontAwesomeIcon icon={Icons.trash} className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCat ? 'Edit Category' : 'Create New Category'}
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
            <div>
              <label className="caption-3 font-semibold text-ink block mb-1">
                English Category Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Smart Gadgets"
                required
                className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
              />
            </div>

            <div>
              <label className="caption-3 font-semibold text-ink block mb-1">
                Bangla Category Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="e.g. স্মার্ট গ্যাজেটস"
                required
                className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
              />
            </div>

            <div>
              <label className="caption-3 font-semibold text-ink block mb-1">
                Category Icon Key
              </label>
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 text-xs text-ink bg-surface focus:outline-none focus:border-quantum"
              >
                <option value="charger">Charger &amp; Plug</option>
                <option value="audio">Audio &amp; Headphones</option>
                <option value="shield">Cases &amp; Protection</option>
                <option value="lightning">Smart Gadgets / Bolt</option>
                <option value="computer">Computer &amp; Laptop</option>
                <option value="category">General Collection</option>
              </select>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm font-semibold"
              >
                {editingCat ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
