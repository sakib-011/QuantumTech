package com.quantumtech.backend.model;

import lombok.Data;

@Data
public class DiscountProductItem {
    private String productId;
    private String variantId;
    private String customDiscountType;
    private Double customDiscountValue;
    private Double salePrice;
}
