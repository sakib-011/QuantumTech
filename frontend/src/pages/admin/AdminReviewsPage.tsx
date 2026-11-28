import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { reviewService } from '../../services/reviewService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Review } from '../../types';
import { Icons } from '../../utilities/icons';
import { Modal } from '../../components/Modal';

export const AdminReviewsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>(() => reviewService.getAllReviewsAdmin());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '5' | '4' | '3' | '2' | '1'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [search, setSearch] = useState('');

  // Modals state
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { showToast } = useToast();

  const refreshReviews = () => {
    const all = reviewService.getAllReviewsAdmin();
    setReviews(all);
    // If selected review was updated, refresh it too
    if (selectedReview) {
      const updated = all.find((r) => r.id === selectedReview.id);
      setSelectedReview(updated || null);
    }
  };

  const handleModerate = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await reviewService.moderateReview(id, status, 'Admin');
      refreshReviews();
      showToast(
        status === 'Approved'
          ? 'Review approved! It is now visible on the customer storefront.'
          : 'Review rejected.',
        status === 'Approved' ? 'success' : 'info'
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update review.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    try {
      await reviewService.deleteReview(reviewToDelete.id);
      if (selectedReview?.id === reviewToDelete.id) {
        setSelectedReview(null);
      }
      refreshReviews();
      setReviewToDelete(null);
      showToast('Customer review permanently deleted.', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete review.', 'error');
    }
  };

  // Filter, Search, and Sort
  const filtered = reviews
    .filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (ratingFilter !== 'ALL' && Math.round(r.rating) !== Number(ratingFilter)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = r.reviewerName.toLowerCase().includes(q);
        const matchEmail = (r.customerEmail || '').toLowerCase().includes(q);
        const matchOrder = (r.orderNumber || '').toLowerCase().includes(q);
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchComment = r.comment.toLowerCase().includes(q);
        const matchProduct = (r.productName || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchOrder && !matchTitle && !matchComment && !matchProduct) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const pendingCount = reviews.filter((r) => r.status === 'Pending').length;
  const approvedCount = reviews.filter((r) => r.status === 'Approved').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="caption-4 font-semibold text-quantum uppercase tracking-wider block mb-1">
            Social Proof &amp; Moderation
          </span>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">Review Management</h1>
          <p className="caption-2 text-muted mt-0.5">
            Moderate customer product feedback before publication to the live storefront
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-2xs">
              <FontAwesomeIcon icon={Icons.reviews} className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="caption-3 font-bold">{pendingCount} Awaiting Moderation</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 shadow-2xs">
            <FontAwesomeIcon icon={Icons.check} className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="caption-3 font-bold">{approvedCount} Published</span>
          </div>
        </div>
      </div>

      {/* Filter, Search, and Sort Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
        {/* Row 1: Status Filters + Search */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-quantum text-white shadow-xs'
                    : 'bg-surface-alt text-slate-700 hover:bg-slate-200 border border-border'
                }`}
              >
                {st} {st === 'Pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviewer, email, order, or comment..."
              className="w-full rounded-xl border border-border pl-8 pr-3 py-1.5 text-xs text-ink focus:outline-none focus:border-quantum bg-surface"
            />
            <div className="absolute left-2.5 top-2 text-muted">
              <FontAwesomeIcon icon={Icons.search} className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Row 2: Rating Filter + Date Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="caption-4 font-bold text-muted uppercase tracking-wider">
              Rating:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto">
              {(
                [
                  { value: 'ALL', label: 'All Ratings' },
                  { value: '5', label: '5 Stars' },
                  { value: '4', label: '4 Stars' },
                  { value: '3', label: '3 Stars' },
                  { value: '2', label: '2 Stars' },
                  { value: '1', label: '1 Star' },
                ] as const
              ).map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setRatingFilter(rt.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    ratingFilter === rt.value
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                      : 'text-slate-600 hover:bg-surface-muted border border-transparent'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="caption-4 font-bold text-muted uppercase tracking-wider">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="rounded-xl border border-border px-3 py-1 text-xs text-ink bg-surface focus:outline-none focus:border-quantum font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr className="caption-3 font-semibold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">{t.admin.reviews.colCustomer}</th>
                <th className="py-3 px-4">{t.admin.reviews.colProduct}</th>
                <th className="py-3 px-4">{t.admin.reviews.colRating}</th>
                <th className="py-3 px-4">{t.admin.reviews.colReview}</th>
                <th className="py-3 px-4">{t.admin.reviews.colDate}</th>
                <th className="py-3 px-4">{t.admin.reviews.colStatus}</th>
                <th className="py-3 px-4 text-right">{t.admin.reviews.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <FontAwesomeIcon icon={Icons.reviews} className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No reviews match the selected filters</p>
                    <p className="caption-4 text-muted mt-1">Try clearing the search query or changing the rating and status filters.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((rev) => (
                  <tr key={rev.id} className="hover:bg-surface-alt/70 transition-colors">
                    {/* Customer Name & Private Email */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-ink">{rev.reviewerName}</span>
                        {rev.customerEmail ? (
                          <div className="flex items-center gap-1 text-xs text-muted font-normal mt-0.5">
                            <FontAwesomeIcon icon={Icons.shield} className="h-2.5 w-2.5 text-quantum" />
                            <span className="truncate max-w-[150px]" title="Private customer email">
                              {rev.customerEmail}
                            </span>
                            <span className="caption-5 px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-semibold uppercase">
                              Private
                            </span>
                          </div>
                        ) : (
                          <span className="caption-5 text-slate-400 italic">No email provided</span>
                        )}
                      </div>
                    </td>

                    {/* Product Name */}
                    <td className="py-3.5 px-4 font-medium text-ink max-w-[180px]">
                      <div className="truncate font-semibold" title={rev.productName || 'QuantumTech Accessory'}>
                        {rev.productName || 'QuantumTech Accessory'}
                      </div>
                    </td>

                    {/* Rating & Verification */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <div className="flex text-amber-400 text-xs">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <FontAwesomeIcon
                                key={i}
                                icon={Icons.star}
                                className={`h-3 w-3 ${i <= rev.rating ? 'text-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                          </div>
                          <span className="caption-4 font-bold text-slate-700 ml-1">{rev.rating}.0</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {rev.isVerifiedPurchase ? (
                            <span className="inline-flex items-center gap-1 caption-5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                              <FontAwesomeIcon icon={Icons.check} className="h-2 w-2 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="caption-5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              Unverified
                            </span>
                          )}

                          {rev.orderNumber && (
                            <span className="caption-5 font-mono text-quantum font-semibold" title="Order Number">
                              {rev.orderNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Review Title & Content & Photos */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex flex-col gap-1">
                        {rev.title && (
                          <span className="caption-3 font-bold text-ink truncate" title={rev.title}>
                            {rev.title}
                          </span>
                        )}
                        <p className="caption-3 text-slate-700 leading-snug line-clamp-2">
                          "{rev.comment}"
                        </p>

                        {/* Customer Photos Thumbnails */}
                        {rev.images && rev.images.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {rev.images.map((img, imgIdx) => (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => setLightboxImage(img)}
                                className="h-8 w-8 rounded-lg overflow-hidden border border-border hover:border-quantum hover:scale-105 transition-all flex-shrink-0 bg-surface-alt"
                                title="Click to view full photo"
                              >
                                <img src={img} alt="Uploaded review photo" className="h-full w-full object-cover" />
                              </button>
                            ))}
                            <span className="caption-5 text-muted ml-0.5 font-medium">
                              ({rev.images.length} photo{rev.images.length > 1 ? 's' : ''})
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Submission Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted">
                      {new Date(rev.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Moderation Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`caption-4 px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                          rev.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rev.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rev.status === 'Approved' && <FontAwesomeIcon icon={Icons.check} className="h-2.5 w-2.5" />}
                        {rev.status === 'Rejected' && <FontAwesomeIcon icon={Icons.close} className="h-2.5 w-2.5" />}
                        {rev.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Full Details Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedReview(rev)}
                          className="btn-base bg-surface border border-border text-slate-700 hover:bg-surface-muted button-xsm"
                          title="View review details & photos"
                        >
                          <FontAwesomeIcon icon={Icons.eye} className="h-3 w-3" />
                        </button>

                        {/* Approve */}
                        {rev.status !== 'Approved' && (
                          <button
                            type="button"
                            onClick={() => handleModerate(rev.id, 'Approved')}
                            className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 button-xsm font-semibold"
                            title="Approve review for public display"
                          >
                            <FontAwesomeIcon icon={Icons.check} className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Reject */}
                        {rev.status !== 'Rejected' && (
                          <button
                            type="button"
                            onClick={() => handleModerate(rev.id, 'Rejected')}
                            className="btn-base bg-amber-500 text-white hover:bg-amber-600 button-xsm font-semibold"
                            title="Reject review"
                          >
                            <FontAwesomeIcon icon={Icons.close} className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setReviewToDelete(rev)}
                          className="btn-base bg-rose-50 text-rose-700 hover:bg-rose-100 button-xsm"
                          title="Delete review permanently"
                        >
                          <FontAwesomeIcon icon={Icons.trash} className="h-3 w-3" />
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

      {/* Review Detail & Moderation Modal */}
      {selectedReview && (
        <Modal
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
          title="Review Details & Moderation"
          maxWidth="lg"
        >
          <div className="flex flex-col gap-5 p-1 text-sm">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-surface-alt border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="caption-4 font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Associated Product
                </span>
                <h4 className="title-3 font-bold text-ink">
                  {selectedReview.productName || 'QuantumTech Accessory'}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`caption-3 px-3 py-1 rounded-full font-bold ${
                    selectedReview.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedReview.status === 'Rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {selectedReview.status}
                </span>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-border bg-surface">
                <span className="caption-4 text-muted font-bold block mb-1">Customer / Reviewer</span>
                <span className="title-4 font-bold text-ink block">{selectedReview.reviewerName}</span>
                {selectedReview.customerEmail ? (
                  <div className="flex items-center gap-1.5 text-muted mt-1">
                    <FontAwesomeIcon icon={Icons.shield} className="h-3 w-3 text-quantum" />
                    <span>{selectedReview.customerEmail}</span>
                    <span className="caption-5 px-1 rounded bg-slate-100 text-slate-600 font-bold">
                      Private
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic mt-1 block">No email provided</span>
                )}
              </div>

              <div className="p-3 rounded-xl border border-border bg-surface">
                <span className="caption-4 text-muted font-bold block mb-1">Order Verification</span>
                <div className="flex items-center gap-2 mt-1">
                  {selectedReview.isVerifiedPurchase ? (
                    <span className="caption-4 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold inline-flex items-center gap-1">
                      <FontAwesomeIcon icon={Icons.check} className="h-2.5 w-2.5 text-emerald-600" />
                      Verified Purchase
                    </span>
                  ) : (
                    <span className="caption-4 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      Unverified Purchase
                    </span>
                  )}
                  {selectedReview.orderNumber && (
                    <span className="font-mono text-quantum font-bold">{selectedReview.orderNumber}</span>
                  )}
                </div>
                <span className="caption-4 text-muted block mt-2">
                  Submitted: {new Date(selectedReview.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Review Content */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex text-amber-400 text-sm">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FontAwesomeIcon
                      key={i}
                      icon={Icons.star}
                      className={`h-4 w-4 ${i <= selectedReview.rating ? 'text-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="caption-3 font-bold text-slate-700">{selectedReview.rating}.0 / 5.0</span>
              </div>

              {selectedReview.title && (
                <h5 className="title-3 font-bold text-ink mt-1">
                  {selectedReview.title}
                </h5>
              )}

              <p className="body-3 text-slate-700 leading-relaxed whitespace-pre-line bg-surface-alt p-3 rounded-xl border border-border/50">
                {selectedReview.comment}
              </p>
            </div>

            {/* Uploaded Photos Gallery */}
            {selectedReview.images && selectedReview.images.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="caption-4 font-bold uppercase tracking-wider text-muted">
                  Customer Uploaded Photos ({selectedReview.images.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedReview.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxImage(img)}
                      className="aspect-square rounded-xl overflow-hidden border border-border hover:border-quantum group relative cursor-pointer"
                    >
                      <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-ink/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs">
                        <FontAwesomeIcon icon={Icons.search} className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setReviewToDelete(selectedReview)}
                className="btn-base bg-rose-50 text-rose-700 hover:bg-rose-100 button-sm font-semibold"
              >
                <FontAwesomeIcon icon={Icons.trash} className="h-3 w-3" />
                <span>Delete Permanently</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedReview.status !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => handleModerate(selectedReview.id, 'Approved')}
                    className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 button-sm font-semibold"
                  >
                    <FontAwesomeIcon icon={Icons.check} className="h-3 w-3" />
                    <span>Approve Review</span>
                  </button>
                )}

                {selectedReview.status !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => handleModerate(selectedReview.id, 'Rejected')}
                    className="btn-base bg-amber-500 text-white hover:bg-amber-600 button-sm font-semibold"
                  >
                    <FontAwesomeIcon icon={Icons.close} className="h-3 w-3" />
                    <span>Reject Review</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="btn-base bg-surface-alt border border-border text-slate-700 button-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <Modal
          isOpen={!!reviewToDelete}
          onClose={() => setReviewToDelete(null)}
          title="Delete Customer Review"
          maxWidth="sm"
        >
          <div className="flex flex-col gap-4 text-sm">
            <p className="caption-2 text-slate-700 leading-relaxed">
              Are you sure you want to permanently delete the review from <strong>{reviewToDelete.reviewerName}</strong>?
              This action cannot be undone and will recalculate product rating statistics immediately.
            </p>
            <div className="p-3 rounded-xl bg-surface-alt border border-border text-xs italic text-slate-600">
              "{reviewToDelete.comment}"
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-base bg-rose-600 text-white hover:bg-rose-700 button-sm font-semibold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden shadow-2xl p-2 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-ink/70 hover:bg-ink text-white flex items-center justify-center transition-all shadow-md"
              aria-label="Close image preview"
            >
              <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
            </button>
            <img
              src={lightboxImage}
              alt="High resolution customer review capture"
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
