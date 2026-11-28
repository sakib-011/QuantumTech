package com.quantumtech.backend.service;

import com.quantumtech.backend.exception.ApiException;
import com.quantumtech.backend.model.Product;
import com.quantumtech.backend.model.ProductVariant;
import com.quantumtech.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProductServiceTest {
    @Test
    void rejectsZeroPrice() {
        ProductRepository repository = mock(ProductRepository.class);
        ProductService service = new ProductService(repository);
        Product product = new Product();
        product.setName("Test");
        product.setPrice(0);

        assertThrows(ApiException.class, () -> service.save(product));
        verify(repository, never()).save(any());
    }

    @Test
    void calculatesStockFromVariants() {
        ProductRepository repository = mock(ProductRepository.class);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        ProductService service = new ProductService(repository);

        Product product = new Product();
        product.setName("Test");
        product.setPrice(100);
        ProductVariant first = new ProductVariant();
        first.setStock(3);
        first.setPrice(100);
        ProductVariant second = new ProductVariant();
        second.setStock(2);
        second.setPrice(110);
        product.setVariants(new ArrayList<>(List.of(first, second)));

        Product saved = service.save(product);
        assertEquals(5, saved.getStock());
        assertEquals(saved.getId(), first.getProductId());
    }

    @Test
    void hidesDeletedProductsFromPublicList() {
        ProductRepository repository = mock(ProductRepository.class);
        Product active = new Product();
        active.setStatus("Active");
        Product deleted = new Product();
        deleted.setStatus("Deleted");
        when(repository.findAll()).thenReturn(List.of(active, deleted));

        ProductService service = new ProductService(repository);
        assertEquals(1, service.publicProducts().size());
    }

    @Test
    void hidesLegacySeedProductsAndDetectsRealAdminProducts() {
        ProductRepository repository = mock(ProductRepository.class);
        Product seed = new Product();
        seed.setId("prod-01");
        seed.setSlug("q-charge-20w-fast-charger");
        Product real = new Product();
        real.setId("admin-product");
        real.setSlug("admin-product");
        when(repository.findAll()).thenReturn(List.of(seed, real));

        ProductService service = new ProductService(repository);

        assertEquals(List.of(real), service.publicProducts());
        assertEquals(List.of(real), service.adminProducts());
        assertTrue(service.hasAdminProducts());
    }

    @Test
    void legacySeedsAloneDoNotCountAsAdminProducts() {
        ProductRepository repository = mock(ProductRepository.class);
        Product seed = new Product();
        seed.setId("prod-01");
        seed.setSlug("q-charge-20w-fast-charger");
        when(repository.findAll()).thenReturn(List.of(seed));

        ProductService service = new ProductService(repository);

        assertFalse(service.hasAdminProducts());
        assertTrue(service.publicProducts().isEmpty());
    }

    @Test
    void hiddenAdminProductsStillSuppressTheSeedCatalog() {
        ProductRepository repository = mock(ProductRepository.class);
        Product hidden = new Product();
        hidden.setId("admin-product");
        hidden.setStatus("Hidden");
        when(repository.findAll()).thenReturn(List.of(hidden));

        ProductService service = new ProductService(repository);

        assertTrue(service.hasAdminProducts());
        assertTrue(service.publicProducts().isEmpty());
    }
}
