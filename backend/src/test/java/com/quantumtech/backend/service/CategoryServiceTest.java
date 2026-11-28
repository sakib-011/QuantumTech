package com.quantumtech.backend.service;

import com.quantumtech.backend.model.Category;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.repository.CategoryRepository;
import com.quantumtech.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CategoryServiceTest {
    @Test
    void hidesUnusedSeedCategoriesButKeepsCategoriesWithRealProducts() {
        CategoryRepository categories = mock(CategoryRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        Category seededCategory = category("cat-audio", "audio");
        Category realCategory = category("cat-laptop", "laptop");
        Product seededProduct = product("prod-02", "airbeat-wireless-earbuds", "cat-audio");
        Product realProduct = product("admin-product", "usb-c-hub", "cat-audio");

        when(categories.findAll()).thenReturn(List.of(seededCategory, realCategory));
        when(products.findAll()).thenReturn(List.of(seededProduct, realProduct));

        List<Category> result = new CategoryService(categories, products).publicCategories();

        assertEquals(2, result.size());
        assertTrue(result.contains(seededCategory));
        assertEquals(1, seededCategory.getProductCount());
        assertTrue(result.contains(realCategory));
    }

    @Test
    void hidesSeedCategoriesWhenOnlySeedProductsUseThem() {
        CategoryRepository categories = mock(CategoryRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        Category seededCategory = category("cat-audio", "audio");
        Product seededProduct = product("prod-02", "airbeat-wireless-earbuds", "cat-audio");

        when(categories.findAll()).thenReturn(List.of(seededCategory));
        when(products.findAll()).thenReturn(List.of(seededProduct));

        assertTrue(new CategoryService(categories, products).publicCategories().isEmpty());
    }

    private Category category(String id, String slug) {
        Category category = new Category();
        category.setId(id);
        category.setSlug(slug);
        category.setStatus("Visible");
        return category;
    }

    private Product product(String id, String slug, String categoryId) {
        Product product = new Product();
        product.setId(id);
        product.setSlug(slug);
        product.setCategoryId(categoryId);
        product.setStatus("Active");
        return product;
    }
}
