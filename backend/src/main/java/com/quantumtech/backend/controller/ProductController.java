package com.quantumtech.backend.controller;

import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductController {
    private final ProductService products;

    public ProductController(ProductService products) {
        this.products = products;
    }

    @GetMapping("/products")
    public List<Product> list(@RequestParam(required = false) String search) {
        return search == null ? products.publicProducts() : products.search(search);
    }

    @GetMapping("/products/has-admin-products")
    public boolean hasAdminProducts() {
        return products.hasAdminProducts();
    }

    @GetMapping("/products/{id}")
    public Product get(@PathVariable String id) {
        return products.getPublicByIdOrSlug(id);
    }

    @GetMapping("/admin/products")
    public List<Product> adminList() {
        return products.adminProducts();
    }

    @GetMapping("/admin/products/{id}")
    public Product adminGet(@PathVariable String id) {
        return products.getAdminById(id);
    }

    @PostMapping("/admin/products")
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@Valid @RequestBody Product product) {
        return products.save(product);
    }

    @PutMapping("/admin/products/{id}")
    public Product update(@PathVariable String id, @Valid @RequestBody Product product) {
        product.setId(id);
        return products.save(product);
    }

    @DeleteMapping("/admin/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        products.softDelete(id);
    }
}
