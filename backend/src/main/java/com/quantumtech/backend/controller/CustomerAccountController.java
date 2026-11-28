package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.CustomerProfileResponse;
import com.quantumtech.backend.dto.CustomerProfileUpdateResponse;
import com.quantumtech.backend.dto.OrderPublicResponse;
import com.quantumtech.backend.dto.UpdateCustomerDetailsRequest;
import com.quantumtech.backend.dto.UpdateCustomerProfileRequest;
import com.quantumtech.backend.service.CustomerAccountService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customer")
public class CustomerAccountController {
    private final CustomerAccountService accounts;

    public CustomerAccountController(CustomerAccountService accounts) {
        this.accounts = accounts;
    }

    @GetMapping("/me")
    public CustomerProfileResponse me(Authentication authentication) {
        return accounts.profile(authentication.getName());
    }

    @PutMapping("/me")
    public CustomerProfileResponse updateMe(Authentication authentication,
                                            @Valid @RequestBody UpdateCustomerProfileRequest request) {
        return accounts.updateProfile(authentication.getName(), request);
    }

    @PutMapping("/me/personal")
    public CustomerProfileUpdateResponse updatePersonalDetails(
            Authentication authentication,
            @Valid @RequestBody UpdateCustomerDetailsRequest request) {
        return accounts.updatePersonalDetails(authentication.getName(), request);
    }

    @GetMapping("/orders")
    public List<OrderPublicResponse> orders(Authentication authentication) {
        return accounts.orders(authentication.getName());
    }
}
