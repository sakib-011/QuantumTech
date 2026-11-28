import { Review, ReviewStats } from '../types';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import { orderService } from './orderService';
import { productService } from './productService';
import { api, isBackendConnected, syncReviewDelete, syncReviewModerate } from './backend';

const legacyDemoReviewIds = new Set(['rev-01', 'rev-02', 'rev-03', 'rev-04']);

function getStoredReviews(): Review[] {
  const stored = getItem<Review[]>(STORAGE_KEYS.REVIEWS, []);
  const realReviews = stored.filter((review) => !legacyDemoReviewIds.has(review.id));
  if (realReviews.length !== stored.length) setItem(STORAGE_KEYS.REVIEWS, realReviews);
  return realReviews;
}

export const reviewService = {
  // Storefront: Returns approved reviews for a given product with optional sorting
  getApprovedReviews(
    productId?: string,
    sortBy: 'newest' | 'highest' | 'lowest' = 'newest'
  ): Review[] {
    const all = getStoredReviews();
    let approved = all.filter(
      r => r.status === 'Approved' && (!productId || r.productId === productId)
    );

    switch (sortBy) {
      case 'highest':
        approved.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'lowest':
        approved.sort((a, b) => a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'newest':
      default:
        approved.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return approved;
  },

  // Storefront: Calculates rating distribution and average based strictly on approved reviews
  getReviewStats(productId: string): ReviewStats {
    const approved = this.getApprovedReviews(productId);
    const totalReviews = approved.length;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    approved.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[star] = (distribution[star] || 0) + 1;
      sum += r.rating;
    });

    const averageRating = totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 5.0;

    const percentages = {
      5: totalReviews > 0 ? Math.round((distribution[5] / totalReviews) * 100) : 0,
      4: totalReviews > 0 ? Math.round((distribution[4] / totalReviews) * 100) : 0,
      3: totalReviews > 0 ? Math.round((distribution[3] / totalReviews) * 100) : 0,
      2: totalReviews > 0 ? Math.round((distribution[2] / totalReviews) * 100) : 0,
      1: totalReviews > 0 ? Math.round((distribution[1] / totalReviews) * 100) : 0,
    };

    return {
      averageRating,
      totalReviews,
      totalCount: totalReviews,
      distribution,
      percentages,
    };
  },

  // Admin Portal: Returns all submitted reviews across all statuses
  getAllReviewsAdmin(): Review[] {
    const all = getStoredReviews();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Verified Purchase Verification Helper
  verifyPurchase(
    orderNumber: string,
    productId: string
  ): { verified: boolean; orderId?: string; error?: string } {
    const cleanNum = orderNumber.trim();
    if (!cleanNum) return { verified: false };

    const order = orderService.getOrderByNumber(cleanNum);
    if (!order) {
      return {
        verified: false,
        error: 'Order number not found. Please double-check your order number, or leave it blank to submit as an unverified review.'
      };
    }

    // Verify order contains this product
    const hasProduct = order.items.some(item => item.productId === productId);
    if (!hasProduct) {
      return {
        verified: false,
        error: 'The provided order does not contain this product. Please check the order number or leave it blank.'
      };
    }

    // Check for duplicate review from this specific order
    const all = this.getAllReviewsAdmin();
    const alreadyReviewed = all.some(
      r => r.productId === productId && (r.orderId === order.id || r.orderNumber === order.orderNumber)
    );
    if (alreadyReviewed) {
      return {
        verified: false,
        error: 'A review has already been submitted for this product with this order number.'
      };
    }

    return { verified: true, orderId: order.id };
  },

  // Submit new review
  async addReview(data: {
    productId: string;
    productName?: string;
    reviewerName: string;
    customerEmail?: string;
    orderNumber?: string;
    rating: number;
    title: string;
    comment: string;
    images?: string[];
  }): Promise<{ success: boolean; review?: Review; error?: string }> {
    if (!isBackendConnected()) {
      return { success: false, error: 'Reviews are unavailable because the backend is not connected.' };
    }
    // 1. Validation: Reviewer Name
    const name = data.reviewerName.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'Please enter a valid display name (at least 2 characters).' };
    }

    // 2. Validation: Rating (1-5)
    const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5)));

    // 3. Validation: Review Title
    const title = data.title.trim();
    if (!title || title.length < 3) {
      return { success: false, error: 'Please provide a review title (at least 3 characters).' };
    }

    // 4. Validation: Review Description / Comment
    const comment = data.comment.trim();
    if (!comment || comment.length < 10) {
      return { success: false, error: 'Review description must be at least 10 characters.' };
    }

    // 5. Validation: Optional Email Address
    let cleanEmail: string | undefined;
    if (data.customerEmail && data.customerEmail.trim()) {
      cleanEmail = data.customerEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }
    }

    // 6. Validation & Verification: Order Number
    // 7. Sanitize uploaded images
    const images: string[] = [];
    if (data.images && Array.isArray(data.images)) {
      for (const img of data.images.slice(0, 4)) {
        if (typeof img === 'string' && (img.startsWith('data:image/') || img.startsWith('http://') || img.startsWith('https://'))) {
          images.push(img);
        }
      }
    }

    if (isBackendConnected()) {
      try {
        const created = await api<Review>('/api/reviews', {
          method: 'POST',
          body: JSON.stringify({
            productId: data.productId,
            productName: data.productName,
            reviewerName: name,
            customerEmail: cleanEmail,
            orderNumber: data.orderNumber?.trim() || undefined,
            rating,
            title,
            comment,
            images: images.filter((image) => image.startsWith('http')),
          }),
        });
        const all = this.getAllReviewsAdmin().filter((review) => review.id !== created.id);
        all.unshift(created);
        setItem(STORAGE_KEYS.REVIEWS, all);
        window.dispatchEvent(new Event('quantum_reviews_updated'));
        return { success: true, review: created };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to submit review.',
        };
      }
    }

    return { success: false, error: 'Review submission failed because the backend is unavailable.' };
  },

  // Moderate review (Approve or Reject)
  async moderateReview(id: string, status: 'Approved' | 'Rejected', moderator: string = 'Admin'): Promise<void> {
    await syncReviewModerate(id, status);
    const all = this.getAllReviewsAdmin();
    const review = all.find(r => r.id === id);
    if (review) {
      review.status = status;
      review.moderatedBy = moderator;
      review.moderatedAt = new Date().toISOString();
      review.updatedAt = new Date().toISOString();
      setItem(STORAGE_KEYS.REVIEWS, all);

      window.dispatchEvent(new Event('quantum_reviews_updated'));
    }
  },

  // Delete review
  async deleteReview(id: string): Promise<void> {
    await syncReviewDelete(id);
    const all = this.getAllReviewsAdmin();
    const target = all.find(r => r.id === id);
    const filtered = all.filter(r => r.id !== id);
    setItem(STORAGE_KEYS.REVIEWS, filtered);

    window.dispatchEvent(new Event('quantum_reviews_updated'));
  },

  // Recalculates product rating and reviewsCount using only approved reviews
  async recalculateProductStats(productId: string): Promise<void> {
    const stats = this.getReviewStats(productId);
    await productService.updateProductRating(productId, stats.averageRating, stats.totalReviews);
  },
};
