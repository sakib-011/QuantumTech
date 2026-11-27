package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("categories")
public class Category {
    @Id private String id;
    private String nameEn;
    private String nameBn;
    private String slug;
    private int sortOrder;
    private String status = "Visible";
    private String iconName;
    private Integer productCount;
}
