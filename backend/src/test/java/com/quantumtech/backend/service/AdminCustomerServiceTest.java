package com.quantumtech.backend.service;

import com.quantumtech.backend.model.CustomerUser;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.OrderStatus;
import com.quantumtech.backend.repository.CustomerUserRepository;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AdminCustomerServiceTest {
    @Test
    void blocksAndUnblocksCustomerAccounts() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        CustomerUser customer = new CustomerUser();
        customer.setId("customer-1");
        OrderRepository orders = mock(OrderRepository.class);
        when(customers.findById("customer-1")).thenReturn(Optional.of(customer));
        when(customers.save(customer)).thenReturn(customer);
        AdminCustomerService service = new AdminCustomerService(customers, orders);

        service.updateBlockedStatus("customer-1", true);
        assertTrue(customer.isBlocked());
        service.updateBlockedStatus("customer-1", false);

        assertFalse(customer.isBlocked());
        verify(customers, times(2)).save(customer);
        verifyNoInteractions(orders);
    }

    @Test
    void deletesCustomerAccountWithoutDeletingOrderRecords() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        CustomerUser customer = new CustomerUser();
        customer.setId("customer-1");
        OrderRepository orders = mock(OrderRepository.class);
        when(customers.findById("customer-1")).thenReturn(Optional.of(customer));
        AdminCustomerService service = new AdminCustomerService(customers, orders);

        service.deleteCustomer("customer-1");

        verify(customers).delete(customer);
        verifyNoInteractions(orders);
    }

    @Test
    void customerActionsReturnNotFoundForUnknownAccounts() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        OrderRepository orders = mock(OrderRepository.class);
        AdminCustomerService service = new AdminCustomerService(customers, orders);

        assertThrows(ApiException.class, () -> service.updateBlockedStatus("missing", true));
        assertThrows(ApiException.class, () -> service.deleteCustomer("missing"));
    }

    @Test
    void countsRegisteredCustomerAccounts() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        when(customers.count()).thenReturn(4L);

        long count = new AdminCustomerService(customers, mock(OrderRepository.class)).countCustomers();

        assertEquals(4L, count);
    }

    @Test
    void summarizesOnlyOrdersLinkedToRegisteredCustomers() {
        CustomerUser customer = new CustomerUser();
        customer.setId("customer-1");
        customer.setName("Customer One");
        customer.setEmail("customer@example.com");
        customer.setPhone("01712345678");
        customer.setDeliveryArea("Inside Dhaka");
        customer.setAddress("House 10, Road 2, Dhaka");
        customer.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        Order deliveredOrder = new Order();
        deliveredOrder.setCustomerId("customer-1");
        deliveredOrder.setStatus(OrderStatus.DELIVERED);
        deliveredOrder.setTotal(1200);
        deliveredOrder.setCreatedAt(Instant.parse("2026-02-01T00:00:00Z"));
        Order pendingOrder = new Order();
        pendingOrder.setCustomerId("customer-1");
        pendingOrder.setStatus(OrderStatus.PENDING);
        pendingOrder.setTotal(800);
        pendingOrder.setCreatedAt(Instant.parse("2026-02-02T00:00:00Z"));
        Order guestOrder = new Order();
        guestOrder.setCustomerId(null);
        guestOrder.setCreatedAt(Instant.parse("2026-03-01T00:00:00Z"));

        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        OrderRepository orders = mock(OrderRepository.class);
        when(customers.findAll()).thenReturn(List.of(customer));
        when(orders.findAll()).thenReturn(List.of(deliveredOrder, pendingOrder, guestOrder));

        var summaries = new AdminCustomerService(customers, orders).listCustomers();

        assertEquals(1, summaries.size());
        assertEquals("customer@example.com", summaries.get(0).email());
        assertEquals("Inside Dhaka", summaries.get(0).deliveryArea());
        assertEquals("House 10, Road 2, Dhaka", summaries.get(0).address());
        assertEquals(2, summaries.get(0).orderCount());
        assertEquals(1, summaries.get(0).deliveredOrderCount());
        assertEquals(1200, summaries.get(0).deliveredRevenue());
        assertEquals(pendingOrder.getCreatedAt(), summaries.get(0).lastOrderAt());
    }
}
