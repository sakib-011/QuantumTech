import { Category, Product } from '../types';
import { seedCategories, seedProducts } from '../data/seedData';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import { syncCategory, syncCategoryOrder } from './backend';

const seedProductSlugs = new Map(seedProducts.map((product) => [product.id, product.slug]));
const seedCategorySlugs = new Map(seedCategories.map((category) => [category.id, category.slug]));

function isLegacySeedProduct(product: Product): boolean {
  const expectedSlug = seedProductSlugs.get(product.id);
  return expectedSlug !== undefined && expectedSlug === product.slug;
}

function isLegacySeedCategory(category: Category): boolean {
  const expectedSlug = seedCategorySlugs.get(category.id);
  return expectedSlug !== undefined && expectedSlug === category.slug;
}

export const categoryService = {
  getAdminCategories(): Category[] {
    const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter(
      (product) => product.status !== 'Deleted' && !isLegacySeedProduct(product)
    );
    const storedCategories = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    return storedCategories
      .filter((category) =>
        !isLegacySeedCategory(category)
        || products.some((product) => product.categoryId === category.id)
      )
      .map((category) => ({
        ...category,
        productCount: products.filter((product) => product.categoryId === category.id).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getCategories(): Category[] {
    const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter(
      (product) => product.status !== 'Deleted' && !isLegacySeedProduct(product)
    );
    const seedCatalogActive = getItem<boolean>(STORAGE_KEYS.SEED_CATALOG_ACTIVE, false)
      && products.length === 0;
    const categories = seedCatalogActive ? seedCategories : this.getAdminCategories();

    return categories
      .map(cat => ({
        ...cat,
        productCount: (seedCatalogActive ? seedProducts : products)
          .filter(p => p.categoryId === cat.id).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getCategoryById(id: string): Category | undefined {
    return this.getCategories().find(c => c.id === id);
  },

  getCategoryBySlug(slug: string): Category | undefined {
    return this.getCategories().find(c => c.slug === slug || c.id === slug);
  },

  async saveCategory(cat: Category): Promise<Category> {
    const stored = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const index = stored.findIndex(c => c.id === cat.id);
    const existing = this.getAdminCategories().find(c => c.id === cat.id);
    const updated = { ...existing, ...cat };

    const saved = await syncCategory(updated, false, index < 0);
    const persistedCategory = saved || updated;
    if (index >= 0) stored[index] = persistedCategory;
    else stored.push(persistedCategory);
    setItem(STORAGE_KEYS.CATEGORIES, stored);
    window.dispatchEvent(new Event('quantum_categories_updated'));
    return persistedCategory;
  },

  async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
    const all = this.getAdminCategories();
    const newId = `cat-${Date.now()}`;
    const newCategory: Category = {
      ...data,
      id: newId,
      sortOrder: data.sortOrder || all.length + 1,
    };

    const saved = await syncCategory(newCategory, false, true);
    const persistedCategory = saved || newCategory;
    all.push(persistedCategory);
    setItem(STORAGE_KEYS.CATEGORIES, all);
    window.dispatchEvent(new Event('quantum_categories_updated'));
    return persistedCategory;
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category | undefined> {
    const all = this.getAdminCategories();
    const index = all.findIndex(c => c.id === id);

    if (index === -1) return undefined;

    const updated: Category = {
      ...all[index],
      ...data,
    };

    const saved = await syncCategory(updated);
    const persistedCategory = saved || updated;
    all[index] = persistedCategory;
    setItem(STORAGE_KEYS.CATEGORIES, all);
    window.dispatchEvent(new Event('quantum_categories_updated'));
    return persistedCategory;
  },

  async reorderCategories(categories: Category[]): Promise<void> {
    const updated = categories.map((cat, index) => ({
      ...cat,
      sortOrder: index + 1,
    }));
    await syncCategoryOrder(updated);
    setItem(STORAGE_KEYS.CATEGORIES, updated);
    window.dispatchEvent(new Event('quantum_categories_updated'));
  },

  async deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter(
      p => p.status !== 'Deleted' && !isLegacySeedProduct(p)
    );
    const activeProducts = products.filter(p => p.categoryId === id);

    if (activeProducts.length > 0) {
      return {
        success: false,
        error: `Cannot delete category: Contains ${activeProducts.length} active product(s). Please reassign or delete these products first.`,
      };
    }

    const removed = this.getAdminCategories().find(c => c.id === id);
    const all = this.getAdminCategories().filter(c => c.id !== id);
    if (removed) await syncCategory(removed, true);
    setItem(STORAGE_KEYS.CATEGORIES, all);
    window.dispatchEvent(new Event('quantum_categories_updated'));
    return { success: true };
  },
};
