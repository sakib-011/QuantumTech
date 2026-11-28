package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.AdminCustomerSummary;
import com.quantumtech.backend.dto.OrderPublicResponse;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.CustomerUser;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.OrderStatus;
import com.quantumtech.backend.repository.CustomerUserRepository;
import com.quantumtech.backend.repository.OrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AdminCustomerService {
    private final CustomerUserRepository customers;
    private final OrderRepository orders;

    public AdminCustomerService(CustomerUserRepository customers, OrderRepository orders) {
        this.customers = customers;
        this.orders = orders;
    }

    public long countCustomers() {
        return customers.count();
    }

    public List<AdminCustomerSummary> listCustomers() {
        Map<String, List<Order>> ordersByCustomer = orders.findAll().stream()
                .filter(order -> order.getCustomerId() != null)
                .collect(Collectors.groupingBy(Order::getCustomerId));

        return customers.findAll().stream()
                .map(customer -> summarize(customer, ordersByCustomer.getOrDefault(customer.getId(), List.of())))
                .sorted(Comparator.comparing(AdminCustomerSummary::createdAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<OrderPublicResponse> customerOrders(String customerId) {
        if (!customers.existsById(customerId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Customer not found");
        }
        return orders.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(OrderPublicResponse::from)
                .toList();
    }

    public void updateBlockedStatus(String customerId, boolean blocked) {
        CustomerUser customer = findCustomer(customerId);
        customer.setBlocked(blocked);
        customer.setUpdatedAt(Instant.now());
        customers.save(customer);
    }

    public void deleteCustomer(String customerId) {
        customers.delete(findCustomer(customerId));
    }

    private CustomerUser findCustomer(String customerId) {
        return customers.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
    }

    private AdminCustomerSummary summarize(CustomerUser customer, List<Order> customerOrders) {
        long deliveredOrders = customerOrders.stream()
                .filter(order -> OrderStatus.DELIVERED.equals(order.getStatus()))
                .count();
        long deliveredRevenue = customerOrders.stream()
                .filter(order -> OrderStatus.DELIVERED.equals(order.getStatus()))
                .mapToLong(Order::getTotal)
                .sum();
        Instant lastOrderAt = customerOrders.stream()
                .map(Order::getCreatedAt)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        return AdminCustomerSummary.from(
                customer, customerOrders.size(), deliveredOrders, deliveredRevenue, lastOrderAt);
    }
}
