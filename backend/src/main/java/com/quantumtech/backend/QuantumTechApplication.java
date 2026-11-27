package com.quantumtech.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class QuantumTechApplication {
    public static void main(String[] args) {
        SpringApplication.run(QuantumTechApplication.class, args);
    }
}
