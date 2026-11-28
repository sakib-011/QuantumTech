package com.quantumtech.backend.controller;

import com.quantumtech.backend.dto.CampaignAnalyticsRequest;
import com.quantumtech.backend.dto.CouponValidationRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.*;
import com.quantumtech.backend.service.PromotionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PromotionController {
    private final PromotionService promotions;

    public PromotionController(PromotionService promotions) {
        this.promotions = promotions;
    }

    @GetMapping("/campaigns")
    public List<Campaign> activeCampaigns() {
        return promotions.campaigns(true);
    }

    @GetMapping("/campaigns/slug/{slug}")
    public Campaign campaignBySlug(@PathVariable String slug) {
        return promotions.campaignBySlug(slug);
    }

    @GetMapping("/admin/campaigns")
    public List<Campaign> allCampaigns() {
        return promotions.campaigns(false);
    }

    @GetMapping("/admin/campaigns/{id}")
    public Campaign campaignById(@PathVariable String id) {
        return promotions.campaignById(id);
    }

    @PostMapping("/admin/campaigns")
    @ResponseStatus(HttpStatus.CREATED)
    public Campaign createCampaign(@Valid @RequestBody Campaign campaign) {
        campaign.setId(null);
        return promotions.saveCampaign(campaign);
    }

    @PutMapping("/admin/campaigns/{id}")
    public Campaign updateCampaign(@PathVariable String id, @Valid @RequestBody Campaign campaign) {
        campaign.setId(id);
        return promotions.saveCampaign(campaign);
    }

    @DeleteMapping("/admin/campaigns/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCampaign(@PathVariable String id) {
        promotions.deleteCampaign(id);
    }

    @GetMapping("/promotions/popups/active")
    public List<PromotionalPopup> activePopups() {
        return promotions.popups(true);
    }

    @GetMapping("/admin/popups")
    public List<PromotionalPopup> allPopups() {
        return promotions.popups(false);
    }

    @GetMapping("/admin/popups/{id}")
    public PromotionalPopup popupById(@PathVariable String id) {
        return promotions.popupById(id);
    }

    @PostMapping("/admin/popups")
    @ResponseStatus(HttpStatus.CREATED)
    public PromotionalPopup createPopup(@Valid @RequestBody PromotionalPopup popup) {
        popup.setId(null);
        return promotions.savePopup(popup);
    }

    @PutMapping("/admin/popups/{id}")
    public PromotionalPopup updatePopup(@PathVariable String id,
                                        @Valid @RequestBody PromotionalPopup popup) {
        popup.setId(id);
        return promotions.savePopup(popup);
    }

    @DeleteMapping("/admin/popups/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePopup(@PathVariable String id) {
        promotions.deletePopup(id);
    }

    @GetMapping("/discounts/active")
    public List<ProductDiscount> activeDiscounts() {
        return promotions.discounts(true);
    }

    @GetMapping("/admin/discounts")
    public List<ProductDiscount> allDiscounts() {
        return promotions.discounts(false);
    }

    @GetMapping("/admin/discounts/{id}")
    public ProductDiscount discountById(@PathVariable String id) {
        return promotions.discountById(id);
    }

    @PostMapping("/admin/discounts")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDiscount createDiscount(@Valid @RequestBody ProductDiscount discount) {
        discount.setId(null);
        return promotions.saveDiscount(discount);
    }

    @PutMapping("/admin/discounts/{id}")
    public ProductDiscount updateDiscount(@PathVariable String id,
                                          @Valid @RequestBody ProductDiscount discount) {
        discount.setId(id);
        return promotions.saveDiscount(discount);
    }

    @DeleteMapping("/admin/discounts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDiscount(@PathVariable String id) {
        promotions.deleteDiscount(id);
    }

    @GetMapping("/admin/coupons")
    public List<Coupon> allCoupons() {
        return promotions.coupons();
    }

    @GetMapping("/admin/coupons/{id}")
    public Coupon couponById(@PathVariable String id) {
        return promotions.couponById(id);
    }

    @PostMapping("/admin/coupons")
    @ResponseStatus(HttpStatus.CREATED)
    public Coupon createCoupon(@Valid @RequestBody Coupon coupon) {
        coupon.setId(null);
        return promotions.saveCoupon(coupon);
    }

    @PutMapping("/admin/coupons/{id}")
    public Coupon updateCoupon(@PathVariable String id, @Valid @RequestBody Coupon coupon) {
        coupon.setId(id);
        return promotions.saveCoupon(coupon);
    }

    @DeleteMapping("/admin/coupons/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCoupon(@PathVariable String id) {
        promotions.deleteCoupon(id);
    }

    @PostMapping("/promotions/coupons/validate")
    public PromotionService.CouponValidationResult validateCoupon(
            @Valid @RequestBody CouponValidationRequest request) {
        return promotions.validateCoupon(request);
    }

    @PostMapping("/campaign-analytics/events")
    @ResponseStatus(HttpStatus.CREATED)
    public CampaignAnalyticsEvent track(@Valid @RequestBody CampaignAnalyticsRequest request) {
        if ("order_completed".equals(request.eventType())
                || "coupon_applied".equals(request.eventType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Order and coupon redemption events are recorded by the server");
        }
        return promotions.track(request);
    }

    @GetMapping("/admin/campaign-analytics/summary")
    public Map<String, Object> analyticsSummary() {
        return promotions.analyticsSummary();
    }

    @GetMapping("/admin/campaign-analytics/events")
    public List<CampaignAnalyticsEvent> analyticsEvents() {
        return promotions.analyticsEvents();
    }

    @DeleteMapping("/admin/campaign-analytics/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearAnalytics() {
        promotions.clearAnalytics();
    }
}
