package com.quantumtech.backend.dto;

import jakarta.validation.constraints.Pattern;

public record ModerateReviewRequest(
        @Pattern(regexp = "Approved|Rejected") String status
) {}
