package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Document("orders")
public class Order {
    @Id private String id;
    private String orderNumber;
    private String customerId;
    private String customerName;
    private String phone;
    private String area;
    private String address;
    private String note;
    private int subtotal;
    private Integer promotionalDiscount;
    private String couponCode;
    private Integer couponDiscount;
    private int deliveryCharge;
    private int total;
    private String paymentMethod;
    private String paymentStatus;
    private String trxId;
    private String senderNumber;
    private String paymentTrxId;
    private String paymentSender;
    private String status = "Pending";
    private String cancellationReason;
    private String source;
    private String idempotencyKey;
    private String language = "en";
    private String notificationStatus = "Pending";
    private Instant createdAt;
    private Instant updatedAt;
    private List<OrderItem> items = new ArrayList<>();
    private List<OrderStatusLog> history = new ArrayList<>();
}
