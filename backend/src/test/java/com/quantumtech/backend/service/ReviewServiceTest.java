package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.ReviewRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.repository.ProductRepository;
import com.quantumtech.backend.repository.ReviewRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReviewServiceTest {
    @Test
    void createsReviewAsPending() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        when(products.findById("prod-1")).thenReturn(Optional.of(new Product()));
        when(reviews.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewService service = new ReviewService(reviews, mock(OrderRepository.class), products);
        var result = service.add(new ReviewRequest(
                "prod-1", "Test Product", "Tanzir Ahmed", null, null,
                5, "Excellent product", "This product works very well.", null));

        assertEquals("Pending", result.getStatus());
        assertFalse(result.isVerifiedPurchase());
    }

    @Test
    void rejectsUnknownProduct() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        when(products.findById("missing")).thenReturn(Optional.empty());

        ReviewService service = new ReviewService(reviews, mock(OrderRepository.class), products);
        assertThrows(ApiException.class, () -> service.add(new ReviewRequest(
                "missing", null, "Tanzir Ahmed", null, null,
                5, "Excellent product", "This product works very well.", List.of())));
    }
}
