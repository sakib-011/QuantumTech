package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.AdminCustomerSummary;
import com.quantumtech.backend.dto.OrderPublicResponse;
import com.quantumtech.backend.dto.UpdateAdminCustomerStatusRequest;
import com.quantumtech.backend.service.AdminCustomerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/customers")
public class AdminCustomerController {
    private final AdminCustomerService customers;

    public AdminCustomerController(AdminCustomerService customers) {
        this.customers = customers;
    }

    @GetMapping
    public List<AdminCustomerSummary> list() {
        return customers.listCustomers();
    }

    @GetMapping("/{customerId}/orders")
    public List<OrderPublicResponse> orders(@PathVariable String customerId) {
        return customers.customerOrders(customerId);
    }

    @PatchMapping("/{customerId}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateStatus(@PathVariable String customerId,
                             @Valid @RequestBody UpdateAdminCustomerStatusRequest request) {
        customers.updateBlockedStatus(customerId, request.blocked());
    }

    @DeleteMapping("/{customerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String customerId) {
        customers.deleteCustomer(customerId);
    }
}
