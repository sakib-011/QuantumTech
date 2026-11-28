package com.quantumtech.backend.service;

import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Category;
import com.quantumtech.backend.repository.CategoryRepository;
import com.quantumtech.backend.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class CategoryService {
    private static final Map<String, String> LEGACY_SEED_SLUGS = Map.of(
            "cat-chargers", "chargers-cables",
            "cat-audio", "audio",
            "cat-cases", "cases-protection",
            "cat-gadgets", "smart-gadgets",
            "cat-computer", "computer-accessories"
    );

    private final CategoryRepository categories;
    private final ProductRepository products;

    public CategoryService(CategoryRepository categories, ProductRepository products) {
        this.categories = categories;
        this.products = products;
    }

    public List<Category> publicCategories() {
        List<Category> result = categories.findAll().stream()
                .filter(c -> "Visible".equals(c.getStatus()))
                .filter(this::isRealOrUsedSeedCategory)
                .sorted(java.util.Comparator.comparingInt(Category::getSortOrder))
                .toList();
        result.forEach(this::addCount);
        return result;
    }

    public List<Category> adminCategories() {
        List<Category> result = categories.findAll().stream()
                .filter(this::isRealOrUsedSeedCategory)
                .sorted(java.util.Comparator.comparingInt(Category::getSortOrder))
                .toList();
        result.forEach(this::addCount);
        return result;
    }

    public Category save(Category category) {
        if (category.getNameEn() == null || category.getNameEn().isBlank()
                || category.getNameBn() == null || category.getNameBn().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "English and Bangla names are required");
        }
        if (category.getSlug() == null || category.getSlug().isBlank()) {
            String slug = Normalizer.normalize(category.getNameEn(), Normalizer.Form.NFD)
                    .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("(^-|-$)", "");
            category.setSlug(slug);
        }
        if (category.getId() == null) category.setId(UUID.randomUUID().toString());
        if (category.getStatus() == null) category.setStatus("Visible");
        return categories.save(category);
    }

    public void delete(String id) {
        long count = products.findAll().stream()
                .filter(p -> id.equals(p.getCategoryId()) && !"Deleted".equals(p.getStatus()))
                .count();
        if (count > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cannot delete category: it contains " + count + " active product(s)");
        }
        categories.deleteById(id);
    }

    public void reorder(List<Category> categoriesInOrder) {
        for (int i = 0; i < categoriesInOrder.size(); i++) {
            Category incoming = categoriesInOrder.get(i);
            Category stored = categories.findById(incoming.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
            stored.setSortOrder(i + 1);
            categories.save(stored);
        }
    }

    private void addCount(Category category) {
        long count = products.findAll().stream()
                .filter(p -> category.getId().equals(p.getCategoryId())
                        && !"Deleted".equals(p.getStatus())
                        && !ProductService.isLegacySeedProduct(p))
                .count();
        category.setProductCount((int) count);
    }

    private boolean isRealOrUsedSeedCategory(Category category) {
        String expectedSlug = LEGACY_SEED_SLUGS.get(category.getId());
        if (expectedSlug == null || !expectedSlug.equals(category.getSlug())) return true;
        return products.findAll().stream().anyMatch(product ->
                category.getId().equals(product.getCategoryId())
                        && !"Deleted".equals(product.getStatus())
                        && !ProductService.isLegacySeedProduct(product));
    }
}
