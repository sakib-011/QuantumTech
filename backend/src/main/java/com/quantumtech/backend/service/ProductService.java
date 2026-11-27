package com.quantumtech.backend.service;

import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.ProductVariant;
import com.quantumtech.backend.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductService {
    private final ProductRepository products;

    public ProductService(ProductRepository products) {
        this.products = products;
    }

    public List<Product> publicProducts() {
        return products.findAll().stream()
                .filter(p -> !"Deleted".equals(p.getStatus()) && !"Hidden".equals(p.getStatus()))
                .peek(this::syncStock)
                .collect(Collectors.toList());
    }

    public List<Product> adminProducts() {
        List<Product> result = products.findAll();
        result.removeIf(p -> "Deleted".equals(p.getStatus()));
        result.forEach(this::syncStock);
        return result;
    }

    public Product getPublicByIdOrSlug(String id) {
        Product product = products.findById(id).or(() -> products.findBySlug(id))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        if ("Hidden".equals(product.getStatus()) || "Deleted".equals(product.getStatus())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Product not found");
        }
        syncStock(product);
        return product;
    }

    public Product getAdminById(String id) {
        Product product = products.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        syncStock(product);
        return product;
    }

    public Product save(Product product) {
        if (product.getPrice() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Price must be greater than zero");
        }
        if (product.getImages() == null) product.setImages(new ArrayList<>());
        if (product.getImages().size() > 6) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A product may have at most 6 images");
        }
        if (product.getVariants() == null) product.setVariants(new ArrayList<>());
        for (ProductVariant variant : product.getVariants()) {
            if (variant.getStock() < 0 || variant.getPrice() < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Variant stock and price cannot be negative");
            }
            variant.setId(Optional.ofNullable(variant.getId()).orElse(UUID.randomUUID().toString()));
        }
        if (product.getVariants().isEmpty()) {
            if (product.getStock() < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Stock cannot be negative");
            }
        } else {
            syncStock(product);
        }
        if (product.getSlug() == null || product.getSlug().isBlank()) {
            product.setSlug(slugify(product.getName()));
        }
        if (product.getId() == null) product.setId(UUID.randomUUID().toString());
        for (ProductVariant variant : product.getVariants()) {
            variant.setProductId(product.getId());
        }
        if (product.getStatus() == null) product.setStatus("Active");
        return products.save(product);
    }

    public void softDelete(String id) {
        Product product = getAdminById(id);
        product.setStatus("Deleted");
        products.save(product);
    }

    public List<Product> search(String query) {
        String clean = query == null ? "" : query.trim().toLowerCase();
        if (clean.isEmpty()) return publicProducts();
        List<String> terms = Arrays.stream(clean.split("\\s+")).toList();
        return publicProducts().stream().filter(product -> {
            String combined = (product.getName() + " " + product.getNameBn() + " "
                    + product.getCategoryName() + " " + product.getCategoryNameBn() + " "
                    + product.getDescription() + " " + product.getDescriptionBn() + " "
                    + String.join(" ", Optional.ofNullable(product.getTags()).orElse(List.of())))
                    .toLowerCase();
            return terms.stream().allMatch(combined::contains);
        }).collect(Collectors.toList());
    }

    private void syncStock(Product product) {
        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            int stock = product.getVariants().stream()
                    .mapToInt(v -> Math.max(0, v.getStock())).sum();
            product.setStock(stock);
        }
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.ROOT);
        return normalized.replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
