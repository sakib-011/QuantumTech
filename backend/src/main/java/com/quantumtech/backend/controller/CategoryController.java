package com.quantumtech.backend.controller;

import com.quantumtech.backend.model.Category;
import com.quantumtech.backend.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CategoryController {
    private final CategoryService categories;

    public CategoryController(CategoryService categories) {
        this.categories = categories;
    }

    @GetMapping("/categories")
    public List<Category> publicList() {
        return categories.publicCategories();
    }

    @GetMapping("/admin/categories")
    public List<Category> adminList() {
        return categories.adminCategories();
    }

    @PostMapping("/admin/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public Category create(@Valid @RequestBody Category category) {
        return categories.save(category);
    }

    @PutMapping("/admin/categories/{id}")
    public Category update(@PathVariable String id, @Valid @RequestBody Category category) {
        category.setId(id);
        return categories.save(category);
    }

    @PutMapping("/admin/categories/reorder")
    public void reorder(@RequestBody List<Category> categories) {
        this.categories.reorder(categories);
    }

    @DeleteMapping("/admin/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        categories.delete(id);
    }
}
