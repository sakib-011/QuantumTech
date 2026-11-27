package com.quantumtech.backend.dto;

import com.quantumtech.backend.model.AdminUser;

public record LoginResponse(String token, String email, String name, String role) {
    public static LoginResponse of(String token, AdminUser user) {
        return new LoginResponse(token, user.getEmail(), user.getName(), user.getRole());
    }
}
