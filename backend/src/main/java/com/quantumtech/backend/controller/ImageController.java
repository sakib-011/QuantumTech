package com.quantumtech.backend.controller;

import com.quantumtech.backend.service.ImageService;
import com.quantumtech.backend.service.LookupRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ImageController {
    private final ImageService imageService;
    private final LookupRateLimiter rateLimiter;

    public ImageController(ImageService imageService, LookupRateLimiter rateLimiter) {
        this.imageService = imageService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/admin/uploads/image")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        return Map.of("url", imageService.upload(file));
    }

    @PostMapping("/reviews/images")
    public Map<String, String> uploadReviewImage(@RequestParam("file") MultipartFile file,
                                                HttpServletRequest request) {
        rateLimiter.check("review-image:" + request.getRemoteAddr());
        return Map.of("url", imageService.upload(file, "quantumtech/reviews"));
    }
}
