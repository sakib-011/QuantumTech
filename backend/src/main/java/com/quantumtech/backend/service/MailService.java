package com.quantumtech.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final String resetBaseUrl;
    private final String from;

    public MailService(JavaMailSender mailSender,
                       @Value("${app.reset-base-url}") String resetBaseUrl,
                       @Value("${spring.mail.username:}") String from) {
        this.mailSender = mailSender;
        this.resetBaseUrl = resetBaseUrl;
        this.from = from;
    }

    public void sendResetLink(String recipient, String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (!from.isBlank()) message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("QuantumTech password reset");
        message.setText("Reset your QuantumTech account password using this link:\n\n"
                + resetBaseUrl + "?token=" + token);
        try {
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send password reset email", ex);
        }
    }

    public void sendResetOtp(String recipient, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (!from.isBlank()) message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("QuantumTech password reset code");
        message.setText("Your QuantumTech password reset code is " + otp
                + ". It expires in 10 minutes. If you did not request this, ignore this email.");
        try {
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send password reset OTP email", ex);
        }
    }

    public boolean sendOwnerNotification(String recipient, com.quantumtech.backend.model.Order order) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (!from.isBlank()) message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("New QuantumTech order " + order.getOrderNumber());
        message.setText("Order: " + order.getOrderNumber() + "\n"
                + "Items: " + order.getItems().size() + "\n"
                + "Total: " + order.getTotal() + " BDT\n"
                + "Payment: " + order.getPaymentMethod() + "\n"
                + "Customer phone: " + order.getPhone());
        try {
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }
}
