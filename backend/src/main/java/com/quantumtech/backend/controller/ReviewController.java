package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.ModerateReviewRequest;
import com.quantumtech.backend.dto.ReviewRequest;
import com.quantumtech.backend.model.Review;
import com.quantumtech.backend.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReviewController {
    private final ReviewService reviews;

    public ReviewController(ReviewService reviews) {
        this.reviews = reviews;
    }

    @GetMapping("/reviews")
    public List<Review> approved(@RequestParam(required = false) String productId,
                                 @RequestParam(required = false, defaultValue = "newest") String sortBy) {
        return reviews.approved(productId, sortBy);
    }

    @GetMapping("/reviews/stats")
    public Map<String, Object> stats(@RequestParam String productId) {
        return reviews.stats(productId);
    }

    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public Review create(@Valid @RequestBody ReviewRequest request) {
        return reviews.add(request);
    }

    @GetMapping("/admin/reviews")
    public List<Review> adminList() {
        return reviews.adminList();
    }

    @PatchMapping("/admin/reviews/{id}")
    public Review moderate(@PathVariable String id,
                           @Valid @RequestBody ModerateReviewRequest request,
                           Authentication authentication) {
        return reviews.moderate(id, request,
                authentication == null ? "Admin" : authentication.getName());
    }

    @DeleteMapping("/admin/reviews/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        reviews.delete(id);
    }
}
