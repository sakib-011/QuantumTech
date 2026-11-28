package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.UpdateAdminProfileRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.AdminUser;
import com.quantumtech.backend.repository.AdminUserRepository;
import com.quantumtech.backend.security.JwtService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    @Test
    void updatesAdminProfileAndReturnsTokenForNewEmail() {
        AdminUserRepository users = mock(AdminUserRepository.class);
        JwtService jwtService = mock(JwtService.class);
        AdminUser user = new AdminUser();
        user.setId("admin-1");
        user.setEmail("old@example.com");
        user.setName("Old Name");
        when(users.findByEmailIgnoreCase("old@example.com")).thenReturn(Optional.of(user));
        when(users.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
        when(users.save(user)).thenReturn(user);
        when(jwtService.generateToken("new@example.com", "ADMIN")).thenReturn("updated-token");
        AuthService service = new AuthService(users, null, jwtService, null);

        var response = service.updateProfile("old@example.com",
                new UpdateAdminProfileRequest(" New Name ", " New@Example.com "));

        assertEquals("New Name", user.getName());
        assertEquals("new@example.com", user.getEmail());
        assertEquals("updated-token", response.token());
        assertEquals("new@example.com", response.email());
        verify(users).save(user);
    }

    @Test
    void rejectsAdminProfileEmailAlreadyUsedByAnotherAccount() {
        AdminUserRepository users = mock(AdminUserRepository.class);
        AdminUser user = new AdminUser();
        user.setId("admin-1");
        user.setEmail("old@example.com");
        AdminUser anotherUser = new AdminUser();
        anotherUser.setId("admin-2");
        when(users.findByEmailIgnoreCase("old@example.com")).thenReturn(Optional.of(user));
        when(users.findByEmailIgnoreCase("taken@example.com")).thenReturn(Optional.of(anotherUser));
        AuthService service = new AuthService(users, null, mock(JwtService.class), null);

        assertThrows(ApiException.class, () -> service.updateProfile("old@example.com",
                new UpdateAdminProfileRequest("Name", "taken@example.com")));
    }
}
