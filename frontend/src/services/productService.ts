import { Product, ProductVariant, Category } from '../types';
import { seedProducts } from '../data/seedData';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import { categoryService } from './categoryService';
import { syncProduct } from './backend';

const seedProductSlugs = new Map(seedProducts.map((product) => [product.id, product.slug]));

export function isSeedCatalogProduct(product: Pick<Product, 'id' | 'slug' | 'isSeedData'>): boolean {
  return product.isSeedData === true || seedProductSlugs.get(product.id) === product.slug;
}

export function isSeedCatalogProductId(productId: string): boolean {
  return seedProductSlugs.has(productId);
}

export function isSeedCatalogActive(): boolean {
  return getItem<boolean>(STORAGE_KEYS.SEED_CATALOG_ACTIVE, false);
}

function getStoredProducts(): Product[] {
  return getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter((product) => !isSeedCatalogProduct(product));
}

function seedProductPreview(product: Product): Product {
  return {
    ...product,
    isSeedData: true,
    variants: product.variants?.map((variant) => ({ ...variant })),
  };
}

export const productService = {
  // Calculate total stock by summing all variant stocks
  calculateTotalStock(variants?: ProductVariant[]): number {
    if (!variants || variants.length === 0) return 0;
    return variants.reduce((sum, v) => sum + Math.max(0, Math.floor(Number(v.stock) || 0)), 0);
  },

  // Synchronize stock for a product: if it has variants, stock is always the sum of variant stocks
  syncProductStock(prod: Product): Product {
    if (prod.variants && prod.variants.length > 0) {
      const calculated = this.calculateTotalStock(prod.variants);
      if (prod.stock !== calculated) {
        prod.stock = calculated;
      }
    } else {
      prod.stock = Math.max(0, Math.floor(Number(prod.stock) || 0));
    }
    return prod;
  },

  // Storefront catalog: only returns Active products that are not Deleted or Hidden
  getProducts(): Product[] {
    const stored = getStoredProducts();
    const visibleProducts = stored
      .map(p => this.syncProductStock(p))
      .filter(p => p.status === 'Active' || !p.status);
    if (stored.some((product) => product.status !== 'Deleted') || !isSeedCatalogActive()) {
      return visibleProducts;
    }
    return seedProducts.map(seedProductPreview).map((product) => this.syncProductStock(product));
  },

  // Admin catalog: returns all products (Active, Hidden)
  getAllProductsAdmin(): Product[] {
    const stored = getStoredProducts();
    return stored
      .map(p => this.syncProductStock(p))
      .filter(p => p.status !== 'Deleted');
  },

  // Lookup product by ID (including hidden products for admin editing)
  getProductById(id: string): Product | undefined {
    const stored = getStoredProducts();
    const prod = stored.find(p => p.id === id);
    return prod ? this.syncProductStock(prod) : undefined;
  },

  // Lookup product by slug
  getProductBySlug(slug: string): Product | undefined {
    const stored = getStoredProducts();
    const prod = stored.find(p => p.slug === slug && (p.status === 'Active' || !p.status));
    if (prod) return this.syncProductStock(prod);
    if (stored.some((product) => product.status !== 'Deleted') || !isSeedCatalogActive()) return undefined;
    const seed = seedProducts.find((product) => product.slug === slug);
    return seed ? this.syncProductStock(seedProductPreview(seed)) : undefined;
  },

  getCategories(): Category[] {
    return categoryService.getCategories();
  },

  getCategoryBySlug(slug: string): Category | undefined {
    return categoryService.getCategoryBySlug(slug);
  },

  getProductsByCategory(categoryIdOrSlug: string): Product[] {
    const category = this.getCategoryBySlug(categoryIdOrSlug);
    const catId = category ? category.id : categoryIdOrSlug;
    return this.getProducts().filter(p => p.categoryId === catId);
  },

  getRelatedProducts(productId: string, limit: number = 4): Product[] {
    const current = this.getProductById(productId) || this.getProducts().find(p => p.id === productId);
    const all = this.getProducts().filter(p => p.id !== productId);
    if (!current) return all.slice(0, limit);

    // Prioritize same category first
    const sameCat = all.filter(p => p.categoryId === current.categoryId);
    const otherCat = all.filter(p => p.categoryId !== current.categoryId);
    return [...sameCat, ...otherCat].slice(0, limit);
  },

  async saveProduct(productData: Partial<Product> & { name: string; price: number; stock: number; categoryId: string }): Promise<Product> {
    const all = getStoredProducts();
    const categories = categoryService.getAdminCategories();
    const cat = categories.find(c => c.id === productData.categoryId);
    const storedCategories = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    if (cat && !storedCategories.some((category) => category.id === cat.id)) {
      await categoryService.saveCategory(cat);
    }

    const id = productData.id || `prod-${Date.now()}`;
    const slug = productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Sanitize variants: ensure stock and price are non-negative
    const rawVariants: ProductVariant[] = (productData.variants || []).map(v => ({
      ...v,
      stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
      price: Math.max(0, Number(v.price) || 0),
    }));

    // Automatic Stock Calculation:
    // When variants exist, main product stock = sum of all variant stocks
    // When no variants exist, use the provided stock value
    const calculatedStock = rawVariants.length > 0
      ? this.calculateTotalStock(rawVariants)
      : Math.max(0, Math.floor(Number(productData.stock) || 0));

    const completeProduct: Product = {
      id,
      name: productData.name.trim(),
      nameBn: productData.nameBn?.trim() || productData.name.trim(),
      slug,
      categoryId: productData.categoryId,
      categoryName: cat?.nameEn || productData.categoryName || 'Accessories',
      categoryNameBn: cat?.nameBn || productData.categoryNameBn || 'এক্সেসরিজ',
      description: productData.description || '',
      descriptionBn: productData.descriptionBn || productData.description || '',
      price: Number(productData.price),
      oldPrice: productData.oldPrice ? Number(productData.oldPrice) : undefined,
      stock: calculatedStock,
      images: productData.images && productData.images.length > 0 ? productData.images : [
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'
      ],
      variants: rawVariants,
      specifications: productData.specifications || {},
      specificationsBn: productData.specificationsBn || {},
      rating: productData.rating || 4.8,
      reviewsCount: productData.reviewsCount || 0,
      isFeatured: !!productData.isFeatured,
      isNew: productData.isNew !== undefined ? productData.isNew : true,
      status: productData.status || 'Active',
      tags: productData.tags || [],
    };

    const index = all.findIndex(p => p.id === id);
    const savedProduct = await syncProduct(completeProduct, false, index < 0);
    const persistedProduct = savedProduct || completeProduct;
    if (index >= 0) all[index] = persistedProduct;
    else all.unshift(persistedProduct);
    setItem(STORAGE_KEYS.PRODUCTS, all);
    setItem(STORAGE_KEYS.SEED_CATALOG_ACTIVE, false);
    window.dispatchEvent(new Event('quantum_products_updated'));
    return persistedProduct;
  },

  createProduct(productData: Partial<Product> & { name: string; price: number; stock?: number; categoryId: string }): Promise<Product> {
    return this.saveProduct({
      ...productData,
      stock: productData.stock ?? 0,
    });
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const all = getStoredProducts();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    const existing = all[index];
    const sanitizedVariants = updates.variants !== undefined
      ? updates.variants.map(v => ({
          ...v,
          stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
          price: Math.max(0, Number(v.price) || 0),
        }))
      : existing.variants;

    const finalStock = (sanitizedVariants && sanitizedVariants.length > 0)
      ? this.calculateTotalStock(sanitizedVariants)
      : (updates.stock !== undefined ? Math.max(0, Math.floor(Number(updates.stock) || 0)) : existing.stock);

    const updatedProduct: Product = {
      ...existing,
      ...updates,
      variants: sanitizedVariants,
      stock: finalStock,
    };

    const savedProduct = await syncProduct(updatedProduct);
    const persistedProduct = savedProduct || updatedProduct;
    all[index] = persistedProduct;
    setItem(STORAGE_KEYS.PRODUCTS, all);
    setItem(STORAGE_KEYS.SEED_CATALOG_ACTIVE, false);
    window.dispatchEvent(new Event('quantum_products_updated'));
    return persistedProduct;
  },

  deductStock(productId: string, quantity: number, variantId?: string): { success: boolean; remainingStock: number; error?: string } {
    if (quantity <= 0) return { success: false, remainingStock: 0, error: 'Quantity must be greater than zero.' };
    const all = getStoredProducts();
    const prod = all.find(p => p.id === productId);
    if (!prod) return { success: false, remainingStock: 0, error: 'Product not found.' };

    if (variantId && prod.variants && prod.variants.length > 0) {
      const variant = prod.variants.find(v => v.id === variantId);
      if (!variant) return { success: false, remainingStock: prod.stock, error: 'Variant not found.' };
      if (variant.stock < quantity) {
        return { success: false, remainingStock: variant.stock, error: `Insufficient variant stock (Available: ${variant.stock}).` };
      }
      variant.stock = Math.max(0, variant.stock - quantity);
      prod.stock = this.calculateTotalStock(prod.variants);
    } else {
      if (prod.stock < quantity) {
        return { success: false, remainingStock: prod.stock, error: `Insufficient product stock (Available: ${prod.stock}).` };
      }
      prod.stock = Math.max(0, prod.stock - quantity);
    }

    setItem(STORAGE_KEYS.PRODUCTS, all);
    window.dispatchEvent(new Event('quantum_products_updated'));
    return { success: true, remainingStock: prod.stock };
  },

  async updateProductRating(productId: string, rating: number, reviewsCount: number): Promise<void> {
    const all = getStoredProducts();
    const prod = all.find(p => p.id === productId);
    if (prod) {
      prod.rating = rating;
      prod.reviewsCount = reviewsCount;
      await syncProduct(prod);
      setItem(STORAGE_KEYS.PRODUCTS, all);
      window.dispatchEvent(new Event('quantum_products_updated'));
    }
  },

  async softDeleteProduct(id: string): Promise<void> {
    const all = getStoredProducts();
    const updated = all.map(p => (p.id === id ? { ...p, status: 'Deleted' as const } : p));
    const removed = updated.find((p) => p.id === id);
    if (!removed) return;
    await syncProduct(removed, true);
    setItem(STORAGE_KEYS.PRODUCTS, updated);
    setItem(
      STORAGE_KEYS.SEED_CATALOG_ACTIVE,
      updated.every((product) => product.status === 'Deleted')
    );
    window.dispatchEvent(new Event('quantum_products_updated'));
  },

  searchProducts(query: string, _lang?: string): Product[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return this.getProducts();

    const terms = clean.split(/\s+/).filter(Boolean);
    
    return this.getProducts().filter(p => {
      const name = p.name.toLowerCase();
      const nameBn = p.nameBn.toLowerCase();
      const cat = p.categoryName.toLowerCase();
      const catBn = p.categoryNameBn.toLowerCase();
      const tags = (p.tags || []).map(t => t.toLowerCase()).join(' ');
      const desc = (p.description || '').toLowerCase();
      const descBn = (p.descriptionBn || '').toLowerCase();

      const combinedText = `${name} ${nameBn} ${cat} ${catBn} ${tags} ${desc} ${descBn}`;

      // All search terms must match somewhere in product data
      return terms.every(term => combinedText.includes(term));
    });
  },
};
