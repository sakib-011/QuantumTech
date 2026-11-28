import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Product } from '../types';
import { PriceDisplay } from './PriceDisplay';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { Icons } from '../utilities/icons';
import { formatDigits, formatNumber } from '../utilities/currency';
import { promotionService } from '../services/promotionService';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=600&q=80';

export const ProductCard: React.FC<ProductCardProps> = ({ product, className = '' }) => {
  const { language, t } = useLanguage();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const isSeedProduct = product.isSeedData === true;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const title = language === 'bn' ? product.nameBn : product.name;
  const categoryTitle = language === 'bn' ? product.categoryNameBn : product.categoryName;
  const primaryImage = product.images[0] || FALLBACK_PRODUCT_IMAGE;
  const [imgSrc, setImgSrc] = React.useState(primaryImage);

  React.useEffect(() => {
    setImgSrc(product.images[0] || FALLBACK_PRODUCT_IMAGE);
  }, [product.images]);

  // Dynamic promotional price calculation
  // Pick first in-stock variant if variants exist, otherwise default to first variant
  const defaultVariant = product.variants && product.variants.length > 0
    ? (product.variants.find((v) => v.stock > 0) || product.variants[0])
    : undefined;
  const priceResult = promotionService.calculateProductPrice(product, defaultVariant?.id);
  const activePrice = priceResult.finalPrice;
  const originalPrice = priceResult.originalPrice > activePrice ? priceResult.originalPrice : undefined;
  const badgeText = priceResult.badgeText;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      addToCart(product, defaultVariant, 1);
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-3 transition-all duration-300 hover:shadow-card-hover hover:border-border-dark ${className}`}
    >
      <div>
        {/* Image Container with details link */}
        <Link
          to={`/product/${product.slug}`}
          className="relative block aspect-square w-full overflow-hidden rounded-lg bg-surface-alt"
          aria-label={`View details for ${title}`}
        >
          <img
            src={imgSrc}
            alt={title}
            loading="lazy"
            onError={() => {
              if (imgSrc !== FALLBACK_PRODUCT_IMAGE) {
                setImgSrc(FALLBACK_PRODUCT_IMAGE);
              }
            }}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-brand group-hover:scale-105"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {isSeedProduct && (
              <span className="caption-3 px-2 py-0.5 rounded bg-warning text-ink shadow-sm font-semibold">
                {language === 'bn' ? 'নমুনা' : 'SAMPLE'}
              </span>
            )}
            {product.isNew && (
              <span className="caption-3 px-2 py-0.5 rounded bg-ink text-white shadow-sm font-semibold">
                {language === 'bn' ? 'নতুন' : 'NEW'}
              </span>
            )}
            {badgeText && (
              <span data-testid="product-promo-badge" className="caption-3 px-2 py-0.5 rounded bg-error text-white shadow-sm font-bold">
                {formatDigits(badgeText, language)}
              </span>
            )}
          </div>

          {/* Stock Status Badge */}
          <div className="absolute bottom-2 left-2 z-10">
            {isOutOfStock ? (
              <span className="caption-4 px-2 py-0.5 rounded bg-error-soft text-error font-medium flex items-center gap-1 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-error" />
                {t.product.outOfStock}
              </span>
            ) : isLowStock ? (
              <span className="caption-4 px-2 py-0.5 rounded bg-warning-soft text-warning-dark font-medium flex items-center gap-1 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {t.product.lowStock.replace('{{count}}', formatNumber(product.stock, language))}
              </span>
            ) : (
              <span className="caption-4 px-2 py-0.5 rounded bg-success-soft text-success-dark font-medium flex items-center gap-1 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {t.product.inStock}
              </span>
            )}
          </div>
        </Link>

        {/* Content Info */}
        <div className="mt-3 flex flex-col gap-1">
          <span className="caption-4 text-muted truncate">
            {categoryTitle}
          </span>

          <Link
            to={`/product/${product.slug}`}
            className="title-3 text-ink font-semibold line-clamp-2 hover:text-quantum transition-colors leading-snug"
          >
            {title}
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex text-amber-400 text-xs">
              <FontAwesomeIcon icon={Icons.star} className="h-3 w-3" />
            </div>
            <span className="caption-3 font-semibold text-ink">
              {formatNumber(product.rating.toFixed(1), language)}
            </span>
            <span className="caption-5 text-muted">
              ({formatNumber(product.reviewsCount, language)})
            </span>
          </div>
        </div>
      </div>

      {/* Price, Quick Add & Product Details Action */}
      <div className="mt-3 pt-2.5 border-t border-border flex flex-col gap-2">
        <PriceDisplay price={activePrice} oldPrice={originalPrice} size="sm" />

        <div className="flex items-center gap-1.5 w-full min-w-0">
          {/* Product Details Action */}
          <Link
            to={`/product/${product.slug}`}
            className="btn-base button-xsm flex-1 px-2 py-1.5 rounded-lg border border-border bg-surface text-ink hover:bg-surface-muted hover:border-slate-300 min-h-[36px] text-center overflow-hidden"
            title="View full specifications & details"
          >
            <FontAwesomeIcon icon={Icons.eye} className="h-3 w-3 text-muted flex-shrink-0" />
            <span className="text-xs truncate">{language === 'bn' ? 'বিস্তারিত' : 'Details'}</span>
          </Link>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isSeedProduct}
            className={`btn-base button-xsm flex-1 px-2 py-1.5 rounded-lg min-h-[36px] overflow-hidden ${
              isOutOfStock || isSeedProduct
                ? 'bg-surface-muted text-muted cursor-not-allowed border border-border'
                : 'bg-quantum text-white hover:bg-quantum-hover active:scale-95 shadow-sm'
            }`}
            aria-label={
              isSeedProduct
                ? (language === 'bn' ? 'শুধু নমুনা, অর্ডার করা যাবে না' : 'Preview only, ordering unavailable')
                : isOutOfStock ? t.product.outOfStock : t.product.addToCart
            }
          >
            <FontAwesomeIcon icon={Icons.cart} className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs truncate">
              {isSeedProduct
                ? (language === 'bn' ? 'শুধু নমুনা' : 'Preview only')
                : isOutOfStock ? t.product.outOfStock : t.product.addToCart}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
