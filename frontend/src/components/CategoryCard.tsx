import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Category } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';

interface CategoryCardProps {
  category: Category;
  isSelected?: boolean;
  variant?: 'chip' | 'card';
  onClick?: () => void;
  className?: string;
  customTo?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  isSelected = false,
  variant = 'card',
  onClick,
  className = '',
  customTo,
}) => {
  const { language } = useLanguage();
  const name = language === 'bn' ? category.nameBn : category.nameEn;
  const targetLink = customTo || `/category/${category.slug}`;

  // Icon mapping
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

  const icon = getCategoryIcon(category.iconName);

  if (variant === 'chip') {
    return (
      <Link
        to={targetLink}
        onClick={onClick}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap active:scale-95 ${
          isSelected
            ? 'bg-quantum text-white shadow-sm'
            : 'bg-surface border border-border text-ink hover:border-quantum/40 hover:bg-quantum-soft hover:text-quantum'
        } ${className}`}
      >
        <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
        <span>{name}</span>
      </Link>
    );
  }

  return (
    <Link
      to={targetLink}
      onClick={onClick}
      className={`group flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 text-center ${
        isSelected
          ? 'bg-quantum-soft border-quantum text-quantum'
          : 'bg-surface border-border hover:border-quantum/30 hover:bg-surface-alt hover:shadow-card'
      } ${className}`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl mb-2.5 transition-colors ${
          isSelected
            ? 'bg-quantum text-white'
            : 'bg-quantum-soft text-quantum group-hover:bg-quantum group-hover:text-white'
        }`}
      >
        <FontAwesomeIcon icon={icon} className="h-5 w-5" />
      </div>

      <span className="title-4 text-ink font-semibold group-hover:text-quantum transition-colors">
        {name}
      </span>

      {category.productCount !== undefined && (
        <span className="caption-4 text-muted mt-0.5">
          {category.productCount} {language === 'bn' ? 'টি পণ্য' : 'items'}
        </span>
      )}
    </Link>
  );
};
