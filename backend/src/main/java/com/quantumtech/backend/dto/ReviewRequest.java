package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ReviewRequest(
        @NotBlank String productId,
        String productName,
        @NotBlank @Size(min = 2) String reviewerName,
        @Email String customerEmail,
        String orderNumber,
        @Min(1) @Max(5) int rating,
        @NotBlank @Size(min = 3) String title,
        @NotBlank @Size(min = 10, max = 500) String comment,
        @Size(max = 4) List<String> images
) {}
