package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.ModerateReviewRequest;
import com.quantumtech.backend.dto.ReviewRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.Review;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.repository.ReviewRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReviewService {
    private final ReviewRepository reviews;
    private final OrderRepository orders;
    private final ProductRepository products;

    public ReviewService(ReviewRepository reviews, OrderRepository orders,
                         ProductRepository products) {
        this.reviews = reviews;
        this.orders = orders;
        this.products = products;
    }

    public List<Review> approved(String productId, String sortBy) {
        List<Review> result = reviews.findAll().stream()
                .filter(r -> "Approved".equals(r.getStatus()))
                .filter(r -> productId == null || productId.isBlank()
                        || productId.equals(r.getProductId()))
                .toList();
        if ("highest".equals(sortBy)) {
            result = result.stream().sorted(Comparator.comparingInt(Review::getRating).reversed()
                    .thenComparing(Review::getCreatedAt, Comparator.reverseOrder())).toList();
        } else if ("lowest".equals(sortBy)) {
            result = result.stream().sorted(Comparator.comparingInt(Review::getRating)
                    .thenComparing(Review::getCreatedAt, Comparator.reverseOrder())).toList();
        } else {
            result = result.stream().sorted(Comparator.comparing(Review::getCreatedAt,
                    Comparator.reverseOrder())).toList();
        }
        return result;
    }

    public Map<String, Object> stats(String productId) {
        List<Review> approved = approved(productId, "newest");
        int[] distribution = new int[6];
        int sum = 0;
        for (Review review : approved) {
            int rating = Math.max(1, Math.min(5, review.getRating()));
            distribution[rating]++;
            sum += rating;
        }
        double average = approved.isEmpty() ? 5.0
                : Math.round((sum * 10.0) / approved.size()) / 10.0;
        Map<String, Object> dist = new LinkedHashMap<>();
        Map<String, Object> percentages = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            dist.put(String.valueOf(i), distribution[i]);
            percentages.put(String.valueOf(i),
                    approved.isEmpty() ? 0 :
                            Math.round(distribution[i] * 100.0 / approved.size()));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("averageRating", average);
        result.put("totalReviews", approved.size());
        result.put("totalCount", approved.size());
        result.put("distribution", dist);
        result.put("percentages", percentages);
        return result;
    }

    public List<Review> adminList() {
        return reviews.findAll().stream()
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.reverseOrder()))
                .toList();
    }

    public Review add(ReviewRequest request) {
        products.findById(request.productId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));

        boolean verified = false;
        String orderId = null;
        String verifiedOrderNumber = null;
        if (request.orderNumber() != null && !request.orderNumber().isBlank()) {
            var order = orders.findByOrderNumberIgnoreCase(request.orderNumber().trim())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                            "Order number not found"));
            boolean containsProduct = order.getItems().stream()
                    .anyMatch(item -> request.productId().equals(item.getProductId()));
            if (!containsProduct) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "The provided order does not contain this product");
            }
            boolean duplicate = reviews.findAll().stream().anyMatch(review ->
                    request.productId().equals(review.getProductId())
                            && (order.getId().equals(review.getOrderId())
                            || order.getOrderNumber().equals(review.getOrderNumber())));
            if (duplicate) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "A review has already been submitted for this product with this order");
            }
            verified = true;
            orderId = order.getId();
            verifiedOrderNumber = order.getOrderNumber();
        }

        Review review = new Review();
        review.setId(UUID.randomUUID().toString());
        review.setProductId(request.productId());
        review.setProductName(request.productName());
        review.setReviewerName(request.reviewerName().trim());
        review.setCustomerEmail(request.customerEmail());
        review.setOrderId(orderId);
        review.setOrderNumber(verifiedOrderNumber);
        review.setRating(request.rating());
        review.setTitle(request.title().trim());
        review.setComment(request.comment().trim());
        review.setImages(request.images());
        review.setVerifiedPurchase(verified);
        review.setStatus("Pending");
        review.setCreatedAt(Instant.now());
        return reviews.save(review);
    }

    public Review moderate(String id, ModerateReviewRequest request, String moderator) {
        Review review = reviews.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        review.setStatus(request.status());
        review.setModeratedBy(moderator);
        review.setModeratedAt(Instant.now());
        review.setUpdatedAt(Instant.now());
        Review saved = reviews.save(review);
        recalculate(review.getProductId());
        return saved;
    }

    public void delete(String id) {
        Review review = reviews.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        reviews.deleteById(id);
        recalculate(review.getProductId());
    }

    private void recalculate(String productId) {
        Map<String, Object> stats = stats(productId);
        products.findById(productId).ifPresent(product -> {
            product.setRating(((Number) stats.get("averageRating")).doubleValue());
            product.setReviewsCount(((Number) stats.get("totalReviews")).intValue());
            products.save(product);
        });
    }
}
