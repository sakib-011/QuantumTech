package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CustomerAuthResponse;
import com.quantumtech.backend.dto.CustomerLoginRequest;
import com.quantumtech.backend.dto.CustomerRegistrationRequest;
import com.quantumtech.backend.dto.UpdateCustomerDetailsRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.CustomerUser;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.repository.CustomerUserRepository;
import com.quantumtech.backend.repository.OrderRepository;
import com.quantumtech.backend.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CustomerAccountServiceTest {
    @Test
    void blockedCustomerCannotLoginOrUseAnExistingSession() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("customer@example.com");
        customer.setBlocked(true);
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), passwordEncoder, mock(JwtService.class),
                mock(MailService.class));

        ApiException loginError = assertThrows(ApiException.class,
                () -> service.login(new CustomerLoginRequest("customer@example.com", "password")));
        ApiException sessionError = assertThrows(ApiException.class,
                () -> service.profile("customer@example.com"));

        assertEquals(HttpStatus.FORBIDDEN, loginError.getStatus());
        assertEquals(HttpStatus.FORBIDDEN, sessionError.getStatus());
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void registrationNormalizesEmailHashesPasswordAndIssuesCustomerSession() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        JwtService jwtService = mock(JwtService.class);
        when(customers.existsByEmailIgnoreCase("customer@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secure-password")).thenReturn("password-hash");
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken("customer@example.com", "CUSTOMER")).thenReturn("customer-token");
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), passwordEncoder, jwtService, mock(MailService.class));

        CustomerAuthResponse response = service.register(new CustomerRegistrationRequest(
                " Customer Name ", " CUSTOMER@EXAMPLE.COM ", "01712345678", "secure-password",
                "Inside Dhaka", "House 10, Road 2, Dhaka"));

        assertEquals("customer-token", response.token());
        assertEquals("customer@example.com", response.email());
        assertEquals("Customer", response.role());
        assertEquals("Inside Dhaka", response.deliveryArea());
        assertEquals("House 10, Road 2, Dhaka", response.address());
        verify(passwordEncoder).encode("secure-password");
        verify(customers).save(argThat(customer ->
                "password-hash".equals(customer.getPasswordHash())
                        && "Customer Name".equals(customer.getName())
                        && "Inside Dhaka".equals(customer.getDeliveryArea())
                        && "House 10, Road 2, Dhaka".equals(customer.getAddress())));
    }

    @Test
    void updatesSavedDeliveryAddressAndArea() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        CustomerUser customer = new CustomerUser();
        customer.setId("customer-123");
        customer.setEmail("customer@example.com");
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), mock(PasswordEncoder.class), mock(JwtService.class),
                mock(MailService.class));

        var profile = service.updateProfile("customer@example.com",
                new com.quantumtech.backend.dto.UpdateCustomerProfileRequest(
                        "Outside Dhaka", "Village 4, Post Office, District"));

        assertEquals("Outside Dhaka", profile.deliveryArea());
        assertEquals("Village 4, Post Office, District", profile.address());
    }

    @Test
    void updatesCustomerDetailsAndReturnsTokenForNewEmail() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        JwtService jwtService = mock(JwtService.class);
        CustomerUser customer = new CustomerUser();
        customer.setId("customer-123");
        customer.setEmail("old@example.com");
        when(customers.findByEmailIgnoreCase("old@example.com")).thenReturn(Optional.of(customer));
        when(customers.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken("new@example.com", "CUSTOMER")).thenReturn("updated-customer-token");
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), mock(PasswordEncoder.class), jwtService,
                mock(MailService.class));

        var response = service.updatePersonalDetails("old@example.com",
                new UpdateCustomerDetailsRequest(" New Name ", " NEW@EXAMPLE.COM ", "+8801712345678"));

        assertEquals("updated-customer-token", response.token());
        assertEquals("new@example.com", response.profile().email());
        assertEquals("New Name", response.profile().name());
        assertEquals("01712345678", response.profile().phone());
        verify(customers).save(argThat(saved ->
                "new@example.com".equals(saved.getEmail())
                        && "New Name".equals(saved.getName())
                        && "01712345678".equals(saved.getPhone())));
    }

    @Test
    void rejectsEmailAlreadyUsedByAnotherCustomer() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("old@example.com");
        when(customers.findByEmailIgnoreCase("old@example.com")).thenReturn(Optional.of(customer));
        when(customers.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), mock(PasswordEncoder.class), mock(JwtService.class),
                mock(MailService.class));

        assertThrows(ApiException.class, () -> service.updatePersonalDetails("old@example.com",
                new UpdateCustomerDetailsRequest("Customer Name", "taken@example.com", "01712345678")));
        verify(customers, never()).save(any(CustomerUser.class));
    }

    @Test
    void orderHistoryQueriesOnlyTheAuthenticatedCustomersOrders() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        OrderRepository orders = mock(OrderRepository.class);
        CustomerUser customer = new CustomerUser();
        customer.setId("customer-123");
        customer.setEmail("customer@example.com");
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        Order order = new Order();
        order.setId("order-123");
        order.setOrderNumber("QT-123");
        order.setCreatedAt(Instant.now());
        when(orders.findByCustomerIdOrderByCreatedAtDesc("customer-123")).thenReturn(List.of(order));
        CustomerAccountService service = new CustomerAccountService(
                customers, orders, mock(PasswordEncoder.class), mock(JwtService.class), mock(MailService.class));

        var history = service.orders("customer@example.com");

        assertEquals(1, history.size());
        assertEquals("QT-123", history.get(0).orderNumber());
        verify(orders).findByCustomerIdOrderByCreatedAtDesc("customer-123");
    }

    @Test
    void customerPasswordResetConsumesTokenAndClearsLoginLockout() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("customer@example.com");
        customer.setResetTokenHash("7c18b43a1d8227cddb332e67971e790ce35ac2303f4fccfb2a565622f2fe1cec");
        customer.setResetTokenExpiresAt(Instant.now().plusSeconds(60));
        customer.setFailedLoginAttempts(5);
        customer.setLockedUntil(Instant.now().plusSeconds(300));
        when(customers.findByResetTokenHash(customer.getResetTokenHash())).thenReturn(Optional.of(customer));
        when(passwordEncoder.encode("new-secure-password")).thenReturn("new-password-hash");
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), passwordEncoder, mock(JwtService.class), mock(MailService.class));

        service.resetPassword("reset-token", "new-secure-password");

        assertEquals("new-password-hash", customer.getPasswordHash());
        assertNull(customer.getResetTokenHash());
        assertNull(customer.getResetTokenExpiresAt());
        assertEquals(0, customer.getFailedLoginAttempts());
        assertNull(customer.getLockedUntil());
    }

    @Test
    void forgotPasswordSendsFourDigitOtpWithoutRevealingUnknownAccounts() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        MailService mailService = mock(MailService.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("customer@example.com");
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenAnswer(invocation -> "hashed-" + invocation.getArgument(0));
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), passwordEncoder, mock(JwtService.class), mailService);

        service.forgotPassword(" CUSTOMER@EXAMPLE.COM ");

        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendResetOtp(eq("customer@example.com"), otp.capture());
        assertTrue(otp.getValue().matches("[0-9]{4}"));
        assertEquals("hashed-" + otp.getValue(), customer.getResetOtpHash());
        assertTrue(customer.getResetOtpExpiresAt().isAfter(Instant.now()));
        assertEquals(1, customer.getResetOtpSendCount());

        service.forgotPassword("unknown@example.com");
        verify(mailService, times(1)).sendResetOtp(anyString(), anyString());
    }

    @Test
    void verifiesOtpInBackendAndReturnsOneTimePasswordResetToken() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("customer@example.com");
        customer.setResetOtpHash("otp-hash");
        customer.setResetOtpExpiresAt(Instant.now().plusSeconds(60));
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("1234", "otp-hash")).thenReturn(true);
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), passwordEncoder, mock(JwtService.class), mock(MailService.class));

        String resetToken = service.verifyPasswordResetOtp("CUSTOMER@example.com", "1234");

        assertTrue(resetToken.matches("[a-f0-9]{64}"));
        assertNull(customer.getResetOtpHash());
        assertNull(customer.getResetOtpExpiresAt());
        assertTrue(customer.getResetTokenHash() != null);
        assertTrue(customer.getResetTokenExpiresAt().isAfter(Instant.now()));
    }

    @Test
    void limitsIncorrectOtpAttempts() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("customer@example.com");
        customer.setResetOtpHash("otp-hash");
        customer.setResetOtpExpiresAt(Instant.now().plusSeconds(60));
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("9999", "otp-hash")).thenReturn(false);
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), passwordEncoder, mock(JwtService.class), mock(MailService.class));

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThrows(ApiException.class,
                    () -> service.verifyPasswordResetOtp("customer@example.com", "9999"));
        }

        assertNull(customer.getResetOtpHash());
        assertNull(customer.getResetOtpExpiresAt());
        assertEquals(0, customer.getResetOtpAttempts());
        verify(customers, times(5)).save(customer);
    }

    @Test
    void rejectsExpiredOtpAndInvalidatesIt() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("customer@example.com");
        customer.setResetOtpHash("otp-hash");
        customer.setResetOtpExpiresAt(Instant.now().minusSeconds(1));
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(customers.save(any(CustomerUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), mock(PasswordEncoder.class),
                mock(JwtService.class), mock(MailService.class));

        assertThrows(ApiException.class,
                () -> service.verifyPasswordResetOtp("customer@example.com", "1234"));

        assertNull(customer.getResetOtpHash());
        assertNull(customer.getResetOtpExpiresAt());
        verify(customers).save(customer);
    }

    @Test
    void throttlesOtpResendsWithoutSendingAnotherEmail() {
        CustomerUserRepository customers = mock(CustomerUserRepository.class);
        MailService mailService = mock(MailService.class);
        CustomerUser customer = new CustomerUser();
        customer.setEmail("customer@example.com");
        customer.setResetOtpWindowStartedAt(Instant.now());
        customer.setResetOtpSendCount(3);
        when(customers.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        CustomerAccountService service = new CustomerAccountService(
                customers, mock(OrderRepository.class), mock(PasswordEncoder.class),
                mock(JwtService.class), mailService);

        service.forgotPassword("customer@example.com");

        verify(customers, never()).save(any(CustomerUser.class));
        verify(mailService, never()).sendResetOtp(anyString(), anyString());
    }
}
