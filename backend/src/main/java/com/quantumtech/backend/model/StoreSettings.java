package com.quantumtech.backend.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("settings")
public class StoreSettings {
    @Id private String id = "store";
    private String storeName = "QuantumTech";
    private String tagline;
    private String taglineBn;
    private String slogan;
    private String phone;
    private String email;
    private String ownerNotificationEmail;
    private String bKashNumber;
    private String nagadNumber;
    private int deliveryChargeInsideDhaka = 70;
    private int deliveryChargeOutsideDhaka = 130;
    private int lowStockThreshold = 5;
    private String facebookUrl;
    private String instagramUrl;
    private String whatsappNumber;
    private String messengerUrl;
    private String address;
    private String businessHours;

    // Lombok's getBKashNumber() makes Jackson use "bkashNumber" and silently drop "bKashNumber"
    // sent by the admin form. Serialize as "bKashNumber" and still accept the old spelling.
    @JsonProperty("bKashNumber")
    public String getBKashNumber() {
        return bKashNumber;
    }

    @JsonProperty("bKashNumber")
    @JsonAlias("bkashNumber")
    public void setBKashNumber(String bKashNumber) {
        this.bKashNumber = bKashNumber;
    }
}
