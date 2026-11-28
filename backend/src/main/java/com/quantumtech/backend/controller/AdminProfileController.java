package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.LoginResponse;
import com.quantumtech.backend.dto.UpdateAdminProfileRequest;
import com.quantumtech.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/admin/profile")
public class AdminProfileController {
    private final AuthService authService;

    public AdminProfileController(AuthService authService) {
        this.authService = authService;
    }

    @PutMapping
    public LoginResponse updateProfile(Principal principal,
                                       @Valid @RequestBody UpdateAdminProfileRequest request) {
        return authService.updateProfile(principal.getName(), request);
    }
}
