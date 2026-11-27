package com.quantumtech.backend.model;

import lombok.Data;

@Data
public class OrderItem {
    private String id;
    private String orderId;
    private String productId;
    private String variantId;
    private String productName;
    private String variantName;
    private int unitPrice;
    private Integer originalPrice;
    private Integer discountAmount;
    private String appliedDiscountId;
    private int quantity;
    private int lineTotal;
    private String image;
}
