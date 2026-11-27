package com.quantumtech.backend.config;

import com.quantumtech.backend.model.AdminUser;
import com.quantumtech.backend.repository.AdminUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminStartup implements CommandLineRunner {
    private final AdminUserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminStartup(AdminUserRepository users, PasswordEncoder encoder,
                        @Value("${app.admin.email}") String email,
                        @Value("${app.admin.password}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(String... args) {
        if (users.findByEmailIgnoreCase(email).isEmpty()) {
            AdminUser user = new AdminUser();
            user.setName("QuantumTech Admin");
            user.setEmail(email.toLowerCase());
            user.setPasswordHash(encoder.encode(password));
            user.setRole("Owner");
            user.setStatus("Active");
            users.save(user);
        }
    }
}
