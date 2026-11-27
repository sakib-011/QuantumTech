package com.quantumtech.backend.model;

import lombok.Data;

@Data
public class ProductVariant {
    private String id;
    private String productId;
    private String attribute;
    private String value;
    private String valueBn;
    private int price;
    private String image;
    private int stock;
}
