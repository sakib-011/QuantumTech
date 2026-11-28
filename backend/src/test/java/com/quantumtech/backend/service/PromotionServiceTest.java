package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.CouponValidationRequest;
import com.quantumtech.backend.model.Coupon;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.ProductDiscount;
import com.quantumtech.backend.repository.*;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PromotionServiceTest {
    @Test
    void appliesHighestPriorityApplicableDiscount() {
        ProductDiscountRepository discounts = mock(ProductDiscountRepository.class);
        ProductDiscount lowerPriority = activeDiscount("lower", 1, 10);
        ProductDiscount higherPriority = activeDiscount("higher", 2, 20);
        when(discounts.findAll()).thenReturn(List.of(lowerPriority, higherPriority));
        PromotionService service = service(discounts, mock(CampaignRepository.class),
                mock(CouponRepository.class), mock(CouponUsageRepository.class));
        Product product = new Product();
        product.setId("product-1");
        product.setPrice(1000);
        product.setStock(10);

        PromotionService.PriceResult result = service.calculateProductPrice(product, null);

        assertEquals(800, result.finalPrice());
        assertEquals("higher", result.discountId());
        assertEquals(200, result.discountAmount());
    }

    @Test
    void validatesCouponUsingEligibleItemsAndDiscountCap() {
        CouponRepository coupons = mock(CouponRepository.class);
        Coupon coupon = new Coupon();
        coupon.setId("coupon-1");
        coupon.setCode("SAVE10");
        coupon.setDiscountType("percentage");
        coupon.setDiscountValue(20);
        coupon.setMaximumDiscount(50.0);
        coupon.setUsageLimit(10);
        coupon.setPerCustomerLimit(2);
        coupon.setActive(true);
        coupon.setStartDate(Instant.now().minusSeconds(60));
        coupon.setEndDate(Instant.now().plusSeconds(600));
        when(coupons.findByCodeIgnoreCase("SAVE10")).thenReturn(Optional.of(coupon));
        CouponUsageRepository usages = mock(CouponUsageRepository.class);
        when(usages.countByCouponIdAndCustomerPhone("coupon-1", "01712345678")).thenReturn(0L);
        PromotionService service = service(mock(ProductDiscountRepository.class),
                mock(CampaignRepository.class), coupons, usages);

        PromotionService.CouponValidationResult result = service.validateCoupon(
                new CouponValidationRequest("SAVE10", "01712345678",
                        List.of(new CouponValidationRequest.CartLine("p1", "c1", 500))));

        assertTrue(result.valid());
        assertEquals(50, result.discountAmount());
    }

    @Test
    void rejectsExpiredCoupon() {
        CouponRepository coupons = mock(CouponRepository.class);
        Coupon coupon = new Coupon();
        coupon.setCode("OLD");
        coupon.setActive(true);
        coupon.setUsageLimit(3);
        coupon.setStartDate(Instant.now().minusSeconds(600));
        coupon.setEndDate(Instant.now().minusSeconds(60));
        when(coupons.findByCodeIgnoreCase("OLD")).thenReturn(Optional.of(coupon));
        PromotionService service = service(mock(ProductDiscountRepository.class),
                mock(CampaignRepository.class), coupons, mock(CouponUsageRepository.class));

        PromotionService.CouponValidationResult result = service.validateCoupon(
                new CouponValidationRequest("OLD", null, List.of(
                        new CouponValidationRequest.CartLine("p1", null, 100))));

        assertFalse(result.valid());
        assertEquals(0, result.discountAmount());
    }

    private ProductDiscount activeDiscount(String id, int priority, double percent) {
        ProductDiscount discount = new ProductDiscount();
        discount.setId(id);
        discount.setName(id);
        discount.setDiscountType("percentage");
        discount.setDiscountValue(percent);
        discount.setTargetType("all");
        discount.setPriority(priority);
        discount.setActive(true);
        discount.setStartDate(Instant.now().minusSeconds(60));
        discount.setEndDate(Instant.now().plusSeconds(600));
        return discount;
    }

    private PromotionService service(ProductDiscountRepository discounts,
                                     CampaignRepository campaigns,
                                     CouponRepository coupons,
                                     CouponUsageRepository usages) {
        return new PromotionService(campaigns, mock(PromotionalPopupRepository.class),
                discounts, coupons, usages, mock(CampaignAnalyticsEventRepository.class),
                mock(OrderRepository.class));
    }
}
