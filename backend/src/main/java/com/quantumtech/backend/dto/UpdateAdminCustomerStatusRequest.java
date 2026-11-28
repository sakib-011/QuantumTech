package com.quantumtech.backend.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateAdminCustomerStatusRequest(@NotNull Boolean blocked) {}
