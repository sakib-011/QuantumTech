package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CampaignAnalyticsRequest;
import com.quantumtech.backend.dto.CouponValidationRequest;
import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.*;
import com.quantumtech.backend.repository.*;
import com.quantumtech.backend.repository.OrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class PromotionService {
    private static final Set<String> CAMPAIGN_STATUSES =
            Set.of("Draft", "Scheduled", "Active", "Paused", "Expired");
    private static final Set<String> ANALYTICS_EVENT_TYPES = Set.of(
            "popup_impression", "popup_close", "popup_click", "campaign_visit",
            "product_click", "coupon_applied", "order_completed");

    private final CampaignRepository campaigns;
    private final PromotionalPopupRepository popups;
    private final ProductDiscountRepository discounts;
    private final CouponRepository coupons;
    private final CouponUsageRepository couponUsages;
    private final CampaignAnalyticsEventRepository analytics;
    private final OrderRepository orders;

    public PromotionService(CampaignRepository campaigns,
                            PromotionalPopupRepository popups,
                            ProductDiscountRepository discounts,
                            CouponRepository coupons,
                            CouponUsageRepository couponUsages,
                            CampaignAnalyticsEventRepository analytics,
                            OrderRepository orders) {
        this.campaigns = campaigns;
        this.popups = popups;
        this.discounts = discounts;
        this.coupons = coupons;
        this.couponUsages = couponUsages;
        this.analytics = analytics;
        this.orders = orders;
    }

    public List<Campaign> campaigns(boolean activeOnly) {
        Instant now = Instant.now();
        return campaigns.findAll().stream()
                .peek(campaign -> synchronizeCampaignStatus(campaign, now))
                .filter(campaign -> !activeOnly || isWithin(campaign.getStartDate(),
                        campaign.getEndDate(), now) && "Active".equals(campaign.getStatus()))
                .sorted(Comparator.comparingInt(Campaign::getPriority).reversed())
                .toList();
    }

    public Campaign campaignBySlug(String slug) {
        Campaign campaign = campaigns.findByLandingPageSlug(slug)
                .orElseThrow(() -> notFound("Campaign not found"));
        Instant now = Instant.now();
        synchronizeCampaignStatus(campaign, now);
        if (!"Active".equals(campaign.getStatus())
                || !isWithin(campaign.getStartDate(), campaign.getEndDate(), now)) {
            throw notFound("Campaign not found");
        }
        return campaign;
    }

    public Campaign campaignById(String id) {
        return campaigns.findById(id).orElseThrow(() -> notFound("Campaign not found"));
    }

    public Campaign saveCampaign(Campaign campaign) {
        if (campaign.getName() == null || campaign.getName().isBlank()
                || campaign.getOccasion() == null || campaign.getOccasion().isBlank()
                || campaign.getStartDate() == null || campaign.getEndDate() == null
                || !campaign.getEndDate().isAfter(campaign.getStartDate())) {
            throw badRequest("Campaign name, occasion, and a valid date range are required");
        }
        if (campaign.getStatus() == null) campaign.setStatus("Draft");
        if (!CAMPAIGN_STATUSES.contains(campaign.getStatus())) {
            throw badRequest("Invalid campaign status");
        }
        if (campaign.getId() == null) {
            campaign.setId("camp-" + UUID.randomUUID());
            campaign.setCreatedAt(Instant.now());
        } else {
            Campaign existing = campaigns.findById(campaign.getId())
                    .orElseThrow(() -> notFound("Campaign not found"));
            campaign.setCreatedAt(existing.getCreatedAt());
        }
        campaign.setUpdatedAt(Instant.now());
        return campaigns.save(campaign);
    }

    public void deleteCampaign(String id) {
        requireExists(campaigns.findById(id).isPresent(), "Campaign not found");
        campaigns.deleteById(id);
    }

    public List<PromotionalPopup> popups(boolean activeOnly) {
        Instant now = Instant.now();
        return popups.findAll().stream()
                .filter(popup -> !activeOnly || popup.isEnabled()
                        && isWithin(popup.getStartDate(), popup.getEndDate(), now))
                .sorted(Comparator.comparingInt(PromotionalPopup::getPriority).reversed())
                .toList();
    }

    public PromotionalPopup savePopup(PromotionalPopup popup) {
        if (popup.getInternalName() == null || popup.getInternalName().isBlank()
                || popup.getHeading() == null || popup.getHeading().isBlank()
                || popup.getTriggerType() == null || popup.getFrequency() == null) {
            throw badRequest("Popup name, heading, trigger, and frequency are required");
        }
        if (popup.getDelaySeconds() < 0 || popup.getScrollPercentage() < 0
                || popup.getScrollPercentage() > 100) {
            throw badRequest("Popup delay must be non-negative and scroll percentage must be 0-100");
        }
        if (popup.getStartDate() != null && popup.getEndDate() != null
                && !popup.getEndDate().isAfter(popup.getStartDate())) {
            throw badRequest("Popup end date must be after its start date");
        }
        if (popup.getId() == null) {
            popup.setId("pop-" + UUID.randomUUID());
            popup.setCreatedAt(Instant.now());
        } else {
            PromotionalPopup existing = popups.findById(popup.getId())
                    .orElseThrow(() -> notFound("Popup not found"));
            popup.setCreatedAt(existing.getCreatedAt());
        }
        popup.setUpdatedAt(Instant.now());
        return popups.save(popup);
    }

    public void deletePopup(String id) {
        requireExists(popups.findById(id).isPresent(), "Popup not found");
        popups.deleteById(id);
    }

    public PromotionalPopup popupById(String id) {
        return popups.findById(id).orElseThrow(() -> notFound("Popup not found"));
    }

    public List<ProductDiscount> discounts(boolean activeOnly) {
        Instant now = Instant.now();
        return discounts.findAll().stream()
                .filter(discount -> !activeOnly || discount.isActive()
                        && isWithin(discount.getStartDate(), discount.getEndDate(), now))
                .sorted(Comparator.comparingInt(ProductDiscount::getPriority).reversed())
                .toList();
    }

    public ProductDiscount discountById(String id) {
        return discounts.findById(id).orElseThrow(() -> notFound("Discount not found"));
    }

    public PriceResult calculateProductPrice(Product product, String variantId) {
        double basePrice = product.getPrice();
        if (variantId != null && product.getVariants() != null) {
            basePrice = product.getVariants().stream()
                    .filter(variant -> variantId.equals(variant.getId()))
                    .mapToDouble(variant -> variant.getPrice() > 0
                            ? variant.getPrice() : product.getPrice())
                    .findFirst()
                    .orElse(basePrice);
        }

        PriceResult best = null;
        for (ProductDiscount discount : discounts(true)) {
            DiscountProductItem productItem = Optional.ofNullable(discount.getProductItems())
                    .orElse(List.of()).stream()
                    .filter(item -> product.getId().equals(item.getProductId())
                            && (item.getVariantId() == null
                            || item.getVariantId().equals(variantId)))
                    .findFirst().orElse(null);
            boolean eligible = "all".equals(discount.getTargetType())
                    || ("category".equals(discount.getTargetType())
                    && Optional.ofNullable(discount.getCategoryIds()).orElse(List.of())
                    .contains(product.getCategoryId()))
                    || productItem != null;
            if (!eligible || (discount.getMinStockRequirement() != null
                    && product.getStock() < discount.getMinStockRequirement())) continue;

            String type = productItem != null && productItem.getCustomDiscountType() != null
                    ? productItem.getCustomDiscountType() : discount.getDiscountType();
            double value = productItem != null && productItem.getCustomDiscountValue() != null
                    ? productItem.getCustomDiscountValue() : discount.getDiscountValue();
            double amount;
            if ("percentage".equals(type)) {
                amount = Math.round(basePrice * value / 100);
            } else if ("fixed".equals(type)) {
                amount = Math.min(basePrice, value);
            } else if ("sale_price".equals(type) && productItem != null
                    && productItem.getSalePrice() != null) {
                amount = Math.max(0, basePrice - productItem.getSalePrice());
            } else {
                amount = Math.round(basePrice * value / 100);
            }
            if (discount.getMaxDiscountAmount() != null
                    && discount.getMaxDiscountAmount() > 0) {
                amount = Math.min(amount, discount.getMaxDiscountAmount());
            }
            amount = Math.min(basePrice, Math.max(0, amount));
            Campaign campaign = discount.getCampaignId() == null ? null
                    : campaigns(true).stream()
                    .filter(candidate -> discount.getCampaignId().equals(candidate.getId()))
                    .findFirst().orElse(null);
            int discountPercent = basePrice > 0
                    ? (int) Math.round(amount * 100 / basePrice) : 0;
            String badgeText = campaign != null && campaign.getBadgeText() != null
                    ? campaign.getBadgeText()
                    : discountPercent > 0 ? "-" + discountPercent + "% OFF" : null;
            PriceResult candidate = new PriceResult(basePrice, basePrice - amount, amount,
                    discount.getId(), campaign == null ? null : campaign.getId(), badgeText,
                    campaign != null && Boolean.TRUE.equals(campaign.getShowCountdown())
                            ? campaign.getEndDate() : discount.getEndDate());
            if (best == null || discount.getPriority() > best.priority()
                    || (discount.getPriority() == best.priority()
                    && candidate.discountAmount() > best.discountAmount())) {
                best = new PriceResult(candidate.originalPrice(), candidate.finalPrice(),
                        candidate.discountAmount(), candidate.discountId(),
                        candidate.campaignId(), candidate.badgeText(), candidate.countdownEnd(),
                        discount.getPriority());
            }
        }
        if (best != null) return best;
        if (product.getOldPrice() != null && product.getOldPrice() > basePrice) {
            return new PriceResult(product.getOldPrice(), basePrice,
                    product.getOldPrice() - basePrice, null, null, null, null);
        }
        return new PriceResult(basePrice, basePrice, 0, null, null, null, null);
    }

    public ProductDiscount saveDiscount(ProductDiscount discount) {
        if (discount.getName() == null || discount.getName().isBlank()
                || discount.getStartDate() == null || discount.getEndDate() == null
                || !discount.getEndDate().isAfter(discount.getStartDate())
                || discount.getDiscountValue() < 0) {
            throw badRequest("Discount name, value, and a valid date range are required");
        }
        if (!Set.of("percentage", "fixed", "sale_price", "variant_specific")
                .contains(discount.getDiscountType())) {
            throw badRequest("Invalid discount type");
        }
        if (!Set.of("specific_products", "category", "all").contains(discount.getTargetType())) {
            throw badRequest("Invalid discount target type");
        }
        if (discount.getId() == null) {
            discount.setId("disc-" + UUID.randomUUID());
            discount.setCreatedAt(Instant.now());
        } else {
            ProductDiscount existing = discounts.findById(discount.getId())
                    .orElseThrow(() -> notFound("Discount not found"));
            discount.setCreatedAt(existing.getCreatedAt());
        }
        discount.setUpdatedAt(Instant.now());
        return discounts.save(discount);
    }

    public void deleteDiscount(String id) {
        requireExists(discounts.findById(id).isPresent(), "Discount not found");
        discounts.deleteById(id);
    }

    public List<Coupon> coupons() {
        return coupons.findAll();
    }

    public Coupon couponById(String id) {
        return coupons.findById(id).orElseThrow(() -> notFound("Coupon not found"));
    }

    public Coupon saveCoupon(Coupon coupon) {
        if (coupon.getCode() == null || coupon.getCode().isBlank()
                || coupon.getStartDate() == null || coupon.getEndDate() == null
                || !coupon.getEndDate().isAfter(coupon.getStartDate())
                || coupon.getDiscountValue() <= 0 || coupon.getUsageLimit() < 1
                || coupon.getPerCustomerLimit() < 1
                || (coupon.getMinLifetimeDeliveredItems() != null
                && coupon.getMinLifetimeDeliveredItems() < 0)) {
            throw badRequest("Coupon code, positive discount, usage limits, and valid dates are required");
        }
        if (!Set.of("percentage", "fixed").contains(coupon.getDiscountType())) {
            throw badRequest("Invalid coupon discount type");
        }
        coupon.setCode(coupon.getCode().trim().toUpperCase(Locale.ROOT));
        coupons.findByCodeIgnoreCase(coupon.getCode())
                .filter(existing -> !existing.getId().equals(coupon.getId()))
                .ifPresent(existing -> {
                    throw new ApiException(HttpStatus.CONFLICT, "Coupon code already exists");
                });
        if (coupon.getId() == null) {
            coupon.setId("cpn-" + UUID.randomUUID());
            coupon.setUsedCount(0);
            coupon.setCreatedAt(Instant.now());
        } else {
            Coupon existing = coupons.findById(coupon.getId())
                    .orElseThrow(() -> notFound("Coupon not found"));
            coupon.setUsedCount(existing.getUsedCount());
            coupon.setCreatedAt(existing.getCreatedAt());
        }
        return coupons.save(coupon);
    }

    public void deleteCoupon(String id) {
        requireExists(coupons.findById(id).isPresent(), "Coupon not found");
        coupons.deleteById(id);
    }

    public CouponValidationResult validateCoupon(CouponValidationRequest request) {
        Coupon coupon = coupons.findByCodeIgnoreCase(request.code().trim())
                .orElse(null);
        if (coupon == null) return CouponValidationResult.invalid("Invalid coupon code. Please verify.");
        Instant now = Instant.now();
        if (!coupon.isActive()) return CouponValidationResult.invalid("This coupon code is currently disabled.");
        if (coupon.getStartDate().isAfter(now)) {
            return CouponValidationResult.invalid("This coupon campaign has not started yet.");
        }
        if (coupon.getEndDate().isBefore(now)) return CouponValidationResult.invalid("This coupon has expired.");
        if (coupon.getUsedCount() >= coupon.getUsageLimit()) {
            return CouponValidationResult.invalid("This coupon has reached its maximum total redemption limit.");
        }

        String customerPhone = normalizePhone(request.customerPhone());
        if (coupon.getMinLifetimeDeliveredItems() != null) {
            if (customerPhone.isBlank()) {
                return CouponValidationResult.invalid(
                        "Enter the phone number on your customer account to use this offer.");
            }
            int deliveredItems = orders.findByPhoneAndStatus(customerPhone, OrderStatus.DELIVERED).stream()
                    .flatMap(order -> Optional.ofNullable(order.getItems()).orElse(List.of()).stream())
                    .mapToInt(OrderItem::getQuantity)
                    .sum();
            if (deliveredItems < coupon.getMinLifetimeDeliveredItems()) {
                return CouponValidationResult.invalid("This offer requires at least "
                        + coupon.getMinLifetimeDeliveredItems() + " delivered items. Your qualifying total is "
                        + deliveredItems + ".");
            }
        }
        if (!customerPhone.isBlank()
                && couponUsages.countByCouponIdAndCustomerPhone(coupon.getId(), customerPhone)
                >= coupon.getPerCustomerLimit()) {
            return CouponValidationResult.invalid("You have already redeemed this coupon the maximum allowed times.");
        }

        List<CouponValidationRequest.CartLine> items =
                Optional.ofNullable(request.items()).orElse(List.of());
        double eligibleSubtotal = items.stream()
                .filter(item -> (coupon.getApplicableProducts() == null
                        || coupon.getApplicableProducts().isEmpty()
                        || coupon.getApplicableProducts().contains(item.productId()))
                        && (coupon.getApplicableCategories() == null
                        || coupon.getApplicableCategories().isEmpty()
                        || coupon.getApplicableCategories().contains(item.categoryId())))
                .mapToDouble(item -> Math.max(0, item.lineTotal()))
                .sum();
        if (eligibleSubtotal <= 0) {
            return CouponValidationResult.invalid("Coupon is not applicable to any items currently in your cart.");
        }
        if (coupon.getMinimumOrderValue() != null
                && eligibleSubtotal < coupon.getMinimumOrderValue()) {
            return CouponValidationResult.invalid("Minimum order value of ৳"
                    + Math.round(coupon.getMinimumOrderValue()) + " required for coupon "
                    + coupon.getCode() + ".");
        }

        double amount = "percentage".equals(coupon.getDiscountType())
                ? Math.round(eligibleSubtotal * coupon.getDiscountValue() / 100)
                : Math.min(eligibleSubtotal, coupon.getDiscountValue());
        if (coupon.getMaximumDiscount() != null && coupon.getMaximumDiscount() > 0) {
            amount = Math.min(amount, coupon.getMaximumDiscount());
        }
        return new CouponValidationResult(true, amount, null, coupon);
    }

    public void recordCouponUsage(String code, String phone, String orderNumber, double amount) {
        Coupon coupon = coupons.findByCodeIgnoreCase(code)
                .orElseThrow(() -> badRequest("Coupon no longer exists"));
        if (coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw new ApiException(HttpStatus.CONFLICT, "Coupon has reached its usage limit");
        }
        String normalizedPhone = normalizePhone(phone);
        if (couponUsages.countByCouponIdAndCustomerPhone(coupon.getId(), normalizedPhone)
                >= coupon.getPerCustomerLimit()) {
            throw new ApiException(HttpStatus.CONFLICT, "Coupon customer usage limit reached");
        }
        coupon.setUsedCount(coupon.getUsedCount() + 1);
        coupons.save(coupon);
        CouponUsage usage = new CouponUsage();
        usage.setId("usg-" + UUID.randomUUID());
        usage.setCouponId(coupon.getId());
        usage.setCouponCode(coupon.getCode());
        usage.setOrderNumber(orderNumber);
        usage.setCustomerPhone(normalizedPhone);
        usage.setDiscountAmount(amount);
        usage.setUsedAt(Instant.now());
        couponUsages.save(usage);
    }

    public CampaignAnalyticsEvent track(CampaignAnalyticsRequest request) {
        if (!ANALYTICS_EVENT_TYPES.contains(request.eventType())) {
            throw badRequest("Invalid analytics event type");
        }
        CampaignAnalyticsEvent event = new CampaignAnalyticsEvent();
        event.setId("evt-" + UUID.randomUUID());
        event.setCampaignId(request.campaignId());
        event.setPopupId(request.popupId());
        event.setEventType(request.eventType());
        event.setProductId(request.productId());
        event.setCouponCode(request.couponCode());
        event.setOrderNumber(request.orderNumber());
        event.setRevenue(request.revenue());
        event.setPageUrl(request.pageUrl());
        event.setTimestamp(Instant.now());

        List<CampaignAnalyticsEvent> events = analytics.findAll().stream()
                .sorted(Comparator.comparing(CampaignAnalyticsEvent::getTimestamp,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();
        int excess = events.size() - 1999;
        if (excess > 0) analytics.deleteAll(events.subList(0, excess));
        return analytics.save(event);
    }

    public List<CampaignAnalyticsEvent> analyticsEvents() {
        return analytics.findAll().stream()
                .sorted(Comparator.comparing(CampaignAnalyticsEvent::getTimestamp,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();
    }

    public Map<String, Object> analyticsSummary() {
        List<CampaignAnalyticsEvent> events = analyticsEvents();
        long impressions = countEvents(events, "popup_impression");
        long closes = countEvents(events, "popup_close");
        long clicks = countEvents(events, "popup_click");
        long orders = countEvents(events, "order_completed");
        double revenue = events.stream()
                .filter(event -> "order_completed".equals(event.getEventType()))
                .map(CampaignAnalyticsEvent::getRevenue)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("impressions", impressions);
        result.put("closes", closes);
        result.put("clicks", clicks);
        result.put("campaignVisits", countEvents(events, "campaign_visit"));
        result.put("productClicks", countEvents(events, "product_click"));
        result.put("couponsUsed", countEvents(events, "coupon_applied"));
        result.put("orders", orders);
        result.put("totalRevenue", revenue);
        result.put("ctr", impressions > 0 ? Math.round(clicks * 1000.0 / impressions) / 10.0 : 0);
        result.put("closeRate", impressions > 0 ? Math.round(closes * 1000.0 / impressions) / 10.0 : 0);
        result.put("recentEvents", events.subList(Math.max(0, events.size() - 50), events.size())
                .reversed());
        return result;
    }

    public void clearAnalytics() {
        analytics.deleteAll();
    }

    private void synchronizeCampaignStatus(Campaign campaign, Instant now) {
        if (campaign.getStartDate() == null || campaign.getEndDate() == null
                || "Paused".equals(campaign.getStatus()) || "Draft".equals(campaign.getStatus())) return;
        if (now.isAfter(campaign.getEndDate()) && !"Expired".equals(campaign.getStatus())) {
            campaign.setStatus("Expired");
            campaign.setUpdatedAt(now);
            campaigns.save(campaign);
        } else if (!now.isBefore(campaign.getStartDate()) && now.isBefore(campaign.getEndDate())
                && "Scheduled".equals(campaign.getStatus())) {
            campaign.setStatus("Active");
            campaign.setUpdatedAt(now);
            campaigns.save(campaign);
        }
    }

    private boolean isWithin(Instant start, Instant end, Instant now) {
        return (start == null || !start.isAfter(now)) && (end == null || !end.isBefore(now));
    }

    private long countEvents(List<CampaignAnalyticsEvent> events, String type) {
        return events.stream().filter(event -> type.equals(event.getEventType())).count();
    }

    private String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("[\\s-]", "");
    }

    private void requireExists(boolean exists, String message) {
        if (!exists) throw notFound(message);
    }

    private ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    private ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public record CouponValidationResult(boolean valid, double discountAmount,
                                         String error, Coupon coupon) {
        static CouponValidationResult invalid(String message) {
            return new CouponValidationResult(false, 0, message, null);
        }
    }

    public record PriceResult(double originalPrice, double finalPrice, double discountAmount,
                              String discountId, String campaignId, String badgeText,
                              Instant countdownEnd, int priority) {
        public PriceResult(double originalPrice, double finalPrice, double discountAmount,
                           String discountId, String campaignId, String badgeText,
                           Instant countdownEnd) {
            this(originalPrice, finalPrice, discountAmount, discountId, campaignId,
                    badgeText, countdownEnd, 0);
        }
    }
}
