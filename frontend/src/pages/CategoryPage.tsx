import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { productService } from '../services/productService';
import { useLanguage } from '../context/LanguageContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { ProductGrid } from '../components/ProductGrid';
import { CategoryCard } from '../components/CategoryCard';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';
import { Icons } from '../utilities/icons';
import { Category, Product } from '../types';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    const handleSync = () => setSyncVersion((v) => v + 1);
    window.addEventListener('quantum_products_updated', handleSync);
    return () => window.removeEventListener('quantum_products_updated', handleSync);
  }, []);

  const categories = productService.getCategories();
  const currentCategory = productService.getCategoryBySlug(slug || '');

  // Reset page when category or filters change
  const handleResetFilters = () => {
    setInStockOnly(false);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Category Icon mapper
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'charger':
        return Icons.charger;
      case 'audio':
        return Icons.audio;
      case 'shield':
        return Icons.shield;
      case 'lightning':
        return Icons.lightning;
      case 'computer':
        return Icons.computer;
      default:
        return Icons.category;
    }
  };

  // Filter only products belonging to this category
  const filteredProducts = useMemo(() => {
    if (!currentCategory) return [];

    let products = productService.getProductsByCategory(currentCategory.id);

    // In Stock Only
    if (inStockOnly) {
      products = products.filter((p) => p.stock > 0);
    }

    // Price Range Filter
    if (minPrice !== undefined) {
      products = products.filter((p) => p.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      products = products.filter((p) => p.price <= maxPrice);
    }

    // Sort Logic
    switch (sortBy) {
      case 'price-asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        products.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
      default:
        products.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }

    return products;
  }, [currentCategory, inStockOnly, minPrice, maxPrice, sortBy, syncVersion]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // If category does not exist
  if (!currentCategory) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <EmptyState
          icon={Icons.category}
          title={language === 'bn' ? 'ক্যাটাগরি খুঁজে পাওয়া যায়নি' : 'Category Not Found'}
          description={
            language === 'bn'
              ? 'আপনার অনুরোধকৃত ক্যাটাগরিটি বিদ্যমান নেই বা সরানো হয়েছে।'
              : 'The category you are looking for does not exist or has been moved.'
          }
          actionText={language === 'bn' ? 'সকল ক্যাটাগরি দেখুন' : 'Browse All Products'}
          onAction={() => navigate('/shop')}
        />
      </div>
    );
  }

  const categoryName = language === 'bn' ? currentCategory.nameBn : currentCategory.nameEn;
  const categoryIcon = getCategoryIcon(currentCategory.iconName);
  const otherCategories = categories.filter((c) => c.id !== currentCategory.id);

  // Descriptions tailored per category
  const categoryDescriptions: Record<string, { en: string; bn: string }> = {
    'chargers-cables': {
      en: 'GaN fast chargers, braided Type-C cables, Lightning cords, and high-wattage power bricks built for durable everyday performance.',
      bn: 'জিএএন ফাস্ট চার্জার, টাইপ-সি ক্যাবল, লাইটনিং ক্যাবল এবং নিরাপদ পাওয়ার অ্যাডাপ্টারের সম্পূর্ণ কালেকশন।',
    },
    audio: {
      en: 'Studio tuned wireless earbuds, noise cancelling headphones, and portable waterproof Bluetooth speakers with punchy bass.',
      bn: 'নয়েজ ক্যান্সেলেশন ইয়ারবাডস, স্টুডিও টিউনড হেডফোন এবং পোর্টেবল ব্লুটুথ স্পিকারের সেরা কালেকশন।',
    },
    'cases-protection': {
      en: 'Drop-tested shockproof cases, anti-scratch tempered glass, and camera lens protectors engineered for absolute phone safety.',
      bn: 'শকপ্রুফ কভার, অ্যান্টি-স্ক্র্যাচ টেম্পার্ড গ্লাস এবং ক্যামেরা লেন্স প্রটেক্টরের বিশ্বস্ত সুরক্ষা।',
    },
    'smart-gadgets': {
      en: 'Smart health fitness watches, high capacity 20,000mAh power banks, magnetic stands, and smart home desk accessories.',
      bn: 'স্মার্ট ওয়াচ, হাই ক্যাপাসিটি পাওয়ার ব্যাংক, ম্যাগনেটিক স্ট্যান্ড এবং আধুনিক স্মার্ট গ্যাজেটস।',
    },
    'computer-accessories': {
      en: 'Ergonomic mechanical keyboards, precision wireless mice, multi-port USB hubs, and laptop cooling stands.',
      bn: 'মেকানিক্যাল কিবোর্ড, ওয়্যারলেস মাউস, ইউএসবি হাব এবং প্রিমিয়াম ল্যাপটপ এক্সেসরিজ।',
    },
  };

  const currentDesc = categoryDescriptions[currentCategory.slug]
    ? language === 'bn'
      ? categoryDescriptions[currentCategory.slug].bn
      : categoryDescriptions[currentCategory.slug].en
    : language === 'bn'
    ? 'কোয়ান্টাম টেকের ভেরিফাইড টেক এক্সেসরিজ।'
    : 'Quality verified technology accessories by QuantumTech.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: t.catalog.categories, href: '/shop' },
          { label: categoryName },
        ]}
      />

      {/* Category Hero Banner */}
      <div className="mt-4 mb-8 rounded-2xl bg-surface border border-border p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-quantum-soft/50 pointer-events-none blur-2xl" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-quantum-soft text-quantum font-semibold text-xs tracking-wide uppercase mb-3">
            <FontAwesomeIcon icon={categoryIcon} className="h-3.5 w-3.5" />
            <span>{language === 'bn' ? 'অফিসিয়াল ক্যাটাগরি' : 'Official Category'}</span>
          </div>

          <h1 className="heading-3 sm:heading-2 font-bold text-ink mb-3">{categoryName}</h1>

          <p className="body-3 text-muted mb-4 text-pretty">{currentDesc}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted">
            <span className="flex items-center gap-1.5 bg-surface-alt px-3 py-1.5 rounded-lg border border-border">
              <FontAwesomeIcon icon={Icons.check} className="h-3 w-3 text-quantum" />
              <span>
                {filteredProducts.length} {language === 'bn' ? 'টি পণ্য উপলব্ধ' : 'Products Available'}
              </span>
            </span>
            <span className="flex items-center gap-1.5 bg-surface-alt px-3 py-1.5 rounded-lg border border-border">
              <FontAwesomeIcon icon={Icons.truck} className="h-3 w-3 text-quantum" />
              <span>{t.trust.deliveryTitle}</span>
            </span>
            <span className="flex items-center gap-1.5 bg-surface-alt px-3 py-1.5 rounded-lg border border-border">
              <FontAwesomeIcon icon={Icons.shield} className="h-3 w-3 text-quantum" />
              <span>{language === 'bn' ? 'অরিজিনাল ওয়ারেন্টি' : 'Original Warranty'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Sorting Controls Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        {/* Results Count & Quick In-Stock Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-ink">
            {filteredProducts.length}{' '}
            <span className="text-muted font-normal">
              {language === 'bn' ? 'টি পণ্য পাওয়া গেছে' : 'products found'}
            </span>
          </span>

          <span className="h-4 w-px bg-border hidden sm:inline-block" />

          {/* In-Stock Only Button Toggle */}
          <button
            type="button"
            data-testid="in-stock-filter"
            onClick={() => {
              setInStockOnly(!inStockOnly);
              setCurrentPage(1);
            }}
            className={`btn-base button-xsm text-xs rounded-lg px-3 py-1.5 border transition-all ${
              inStockOnly
                ? 'bg-quantum text-white border-quantum shadow-sm'
                : 'bg-surface border-border text-ink hover:bg-surface-muted'
            }`}
          >
            <FontAwesomeIcon icon={Icons.check} className="h-3 w-3" />
            <span>{t.catalog.inStockOnly}</span>
          </button>

          {(inStockOnly || minPrice !== undefined || maxPrice !== undefined || sortBy !== 'newest') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-quantum font-semibold hover:underline flex items-center gap-1 ml-1"
            >
              <FontAwesomeIcon icon={Icons.refresh} className="h-2.5 w-2.5" />
              <span>{t.catalog.clearFilters}</span>
            </button>
          )}
        </div>

        {/* Sort & Price Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Price Range Filter Inputs */}
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>{t.catalog.priceRange}:</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setMinPrice(val);
                setCurrentPage(1);
              }}
              className="w-16 h-8 px-2 rounded-lg border border-border bg-surface text-xs text-ink focus:outline-none focus:border-quantum"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setMaxPrice(val);
                setCurrentPage(1);
              }}
              className="w-16 h-8 px-2 rounded-lg border border-border bg-surface text-xs text-ink focus:outline-none focus:border-quantum"
            />
          </div>

          <span className="h-4 w-px bg-border hidden sm:inline-block" />

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="cat-sort" className="text-xs text-muted font-medium whitespace-nowrap">
              {t.catalog.sortBy}:
            </label>
            <div className="relative">
              <select
                id="cat-sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="h-8 pl-2.5 pr-8 rounded-lg border border-border bg-surface text-xs font-medium text-ink focus:outline-none focus:border-quantum appearance-none cursor-pointer"
              >
                <option value="newest">{t.catalog.sortNewest}</option>
                <option value="price-asc">{t.catalog.sortPriceAsc}</option>
                <option value="price-desc">{t.catalog.sortPriceDesc}</option>
                <option value="rating">{t.catalog.sortRating}</option>
              </select>
              <FontAwesomeIcon
                icon={Icons.chevronDown}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid Section (Strictly in this category) */}
      <section aria-label={`${categoryName} Products`}>
        {filteredProducts.length === 0 ? (
          <div className="py-12 bg-surface rounded-2xl border border-border">
            <EmptyState
              icon={Icons.search}
              title={language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products matched this filter'}
              description={
                language === 'bn'
                  ? 'ফিল্টারের মান পরিবর্তন করে আবার চেষ্টা করুন।'
                  : 'Try adjusting your price range or stock status filter.'
              }
              actionText={t.catalog.clearFilters}
              onAction={handleResetFilters}
            />
          </div>
        ) : (
          <>
            <ProductGrid products={paginatedProducts} />

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* Explore Other Categories Strip */}
      <div className="mt-16 pt-10 border-t border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="heading-5 font-bold text-ink">
              {language === 'bn' ? 'অন্যান্য ক্যাটাগরি ঘুরে দেখুন' : 'Explore Other Categories'}
            </h2>
            <p className="caption-2 text-muted mt-0.5">
              {language === 'bn'
                ? 'আপনার প্রয়োজনীয় অন্যান্য গ্যাজেট ও এক্সেসরিজ'
                : 'Discover more tech essentials across our store'}
            </p>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold text-quantum hover:underline flex items-center gap-1.5"
          >
            <span>{t.catalog.viewAll}</span>
            <FontAwesomeIcon icon={Icons.arrowRight} className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {otherCategories.slice(0, 4).map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </div>
    </div>
  );
};
