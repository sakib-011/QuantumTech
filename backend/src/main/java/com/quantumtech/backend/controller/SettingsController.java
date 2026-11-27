package com.quantumtech.backend.controller;

import com.quantumtech.backend.model.StoreSettings;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.repository.SettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class SettingsController {
    private final SettingsRepository settings;

    public SettingsController(SettingsRepository settings) {
        this.settings = settings;
    }

    @GetMapping("/settings")
    public StoreSettings get() {
        return settings.findById("store").orElse(new StoreSettings());
    }

    @PutMapping("/admin/settings")
    public StoreSettings update(@RequestBody StoreSettings incoming) {
        incoming.setId("store");
        if (incoming.getDeliveryChargeInsideDhaka() < 0
                || incoming.getDeliveryChargeOutsideDhaka() < 0
                || incoming.getLowStockThreshold() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Settings values cannot be negative");
        }
        return settings.save(incoming);
    }
}
