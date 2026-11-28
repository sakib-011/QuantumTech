import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SearchBar } from './SearchBar';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { categoryService } from '../services/categoryService';
import logoIcon from '../assets/brand/logo-icon.png';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  const location = useLocation();
  const { totalCount, setIsCartOpen } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [categories, setCategories] = useState(() => 
    categoryService.getCategories().filter(c => c.status === 'Visible')
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSync = () => {
      setCategories(categoryService.getCategories().filter(c => c.status === 'Visible'));
    };
    window.addEventListener('quantum_categories_updated', handleSync);
    return () => window.removeEventListener('quantum_categories_updated', handleSync);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  // Close menus automatically on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setCategoriesDropdownOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoriesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close mobile drawer on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
        setCategoriesDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Category Icon mapper
  const getCatIcon = (iconName: string) => {
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

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      {/* Top Announcement Bar */}
      <div className="bg-ink text-slate-200 py-1 px-3 text-[11px] sm:text-xs font-medium text-center flex items-center justify-center gap-2 border-b border-slate-800">
        <FontAwesomeIcon icon={Icons.delivery} className="text-quantum-soft h-3 w-3 flex-shrink-0" />
        <span className="truncate max-w-[340px] sm:max-w-none">
          {language === 'bn'
            ? 'সারাদেশে ক্যাশ অন ডেলিভারি • ঢাকার ভিতরে ১-২ দিনে ডেলিভারি'
            : 'Nationwide Cash on Delivery • 1-2 Days Inside Dhaka • 100% Genuine Tech'}
        </span>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-4">
          
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {/* Mobile Menu Button */}
            <button
              type="button"
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex h-10 w-10 sm:h-11 sm:w-11 min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-ink hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              <FontAwesomeIcon
                icon={mobileMenuOpen ? Icons.close : Icons.menu}
                className="h-4 w-4 sm:h-4.5 sm:w-4.5"
              />
            </button>

            {/* Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group flex-shrink-0 min-w-0">
              <img
                src={logoIcon}
                alt="QuantumTech Logo"
                className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="text-sm sm:text-lg font-bold tracking-tight text-ink leading-none">
                  Quantum<span className="text-quantum">Tech</span>
                </span>
                <span className="caption-5 text-muted hidden md:block mt-0.5">
                  {language === 'bn' ? 'স্মার্ট এক্সেসরিজ' : 'Modern Accessories'}
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation with Categories Dropdown */}
          <nav className="hidden xl:flex flex-shrink-0 items-center gap-0 xl:gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `whitespace-nowrap px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-quantum font-semibold bg-quantum-soft'
                    : 'text-ink hover:text-quantum hover:bg-surface-alt'
                }`
              }
            >
              {t.nav.home}
            </NavLink>

            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `whitespace-nowrap px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-quantum font-semibold bg-quantum-soft'
                    : 'text-ink hover:text-quantum hover:bg-surface-alt'
                }`
              }
            >
              {t.nav.shop}
            </NavLink>

            {/* Categories Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoriesDropdownOpen
                    ? 'text-quantum bg-quantum-soft font-semibold'
                    : 'text-ink hover:text-quantum hover:bg-surface-alt'
                }`}
                aria-expanded={categoriesDropdownOpen}
                aria-haspopup="true"
              >
                <span>{t.catalog.categories}</span>
                <FontAwesomeIcon
                  icon={Icons.chevronDown}
                  className={`h-2.5 w-2.5 transition-transform duration-200 ${
                    categoriesDropdownOpen ? 'rotate-180 text-quantum' : 'text-muted'
                  }`}
                />
              </button>

              {/* Categories Dropdown Panel */}
              {categoriesDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-xl bg-surface border border-border shadow-float p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <span className="caption-4 uppercase font-semibold text-muted tracking-wider">
                      Product Categories
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        onClick={() => setCategoriesDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink hover:bg-quantum-soft hover:text-quantum transition-colors group"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-alt border border-border group-hover:border-quantum/30 text-muted group-hover:text-quantum transition-colors">
                          <FontAwesomeIcon icon={getCatIcon(cat.iconName)} className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs sm:text-sm">
                            {language === 'bn' ? cat.nameBn : cat.nameEn}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-border px-2">
                    <Link
                      to="/shop"
                      onClick={() => setCategoriesDropdownOpen(false)}
                      className="caption-3 font-semibold text-quantum hover:underline flex items-center justify-between p-1.5"
                    >
                      <span>{t.catalog.viewAll}</span>
                      <FontAwesomeIcon icon={Icons.arrowRight} className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <NavLink
              to="/track-order"
              className={({ isActive }) =>
                `whitespace-nowrap px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-quantum font-semibold bg-quantum-soft'
                    : 'text-ink hover:text-quantum hover:bg-surface-alt'
                }`
              }
            >
              {t.nav.trackOrder}
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                `whitespace-nowrap px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-quantum font-semibold bg-quantum-soft'
                    : 'text-ink hover:text-quantum hover:bg-surface-alt'
                }`
              }
            >
              {t.nav.about}
            </NavLink>

            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `whitespace-nowrap px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-quantum font-semibold bg-quantum-soft'
                    : 'text-ink hover:text-quantum hover:bg-surface-alt'
                }`
              }
            >
              {t.nav.contact}
            </NavLink>
          </nav>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex min-w-0 flex-1 max-w-xs xl:max-w-sm mx-2">
            <SearchBar />
          </div>

          {/* Right Actions: Search (Mobile), Language, Cart */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Mobile Search Button (40px min touch target) */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden flex h-10 w-8.5 sm:h-11 sm:w-11 min-h-[40px] items-center justify-center rounded-lg text-ink hover:bg-surface-muted transition-colors active:scale-95"
              aria-label="Search products"
            >
              <FontAwesomeIcon icon={Icons.search} className="h-4 w-4" />
            </button>

            {/* Theme Toggle (Light / Dark mode) - VISIBLE ON ALL SCREENS */}
            <ThemeToggle
              variant="icon"
              className="h-10 w-8.5 sm:w-11 sm:h-11 min-h-[40px]"
            />

            {/* Language Switcher (40px min touch target) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center justify-center h-10 sm:h-11 min-h-[40px] px-1.5 sm:px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-ink transition-colors active:scale-95"
              aria-label={`Switch language: ${language === 'en' ? 'Bangla' : 'English'}`}
            >
              <span className={language === 'en' ? 'text-quantum font-bold' : 'text-muted'}>
                EN
              </span>
              <span className="text-border-dark mx-0.5">/</span>
              <span className={language === 'bn' ? 'text-quantum font-bold' : 'text-muted'}>
                বাং
              </span>
            </button>

            {/* Customer account entry point */}
            <Link
              to="/account"
              className="hidden md:flex h-10 sm:h-11 min-h-[40px] items-center justify-center gap-2 px-2.5 sm:px-3 rounded-lg border border-border bg-surface text-ink hover:border-quantum/40 hover:text-quantum transition-colors active:scale-95"
              aria-label={t.nav.account}
              title={t.nav.account}
              data-testid="desktop-account-link"
            >
              <FontAwesomeIcon icon={Icons.user} className="h-3.5 w-3.5" />
              <span className="hidden xl:inline text-xs font-semibold whitespace-nowrap">
                {t.nav.account}
              </span>
            </Link>

            {/* Shopping Cart Button (40px min touch target) */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center justify-center gap-1 sm:gap-1.5 h-10 sm:h-11 min-h-[40px] px-2 sm:px-3.5 rounded-xl bg-quantum text-white hover:bg-quantum-hover active:scale-95 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum"
              aria-label={`Shopping cart with ${totalCount} items`}
            >
              <FontAwesomeIcon icon={Icons.cart} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs font-semibold">
                {t.header.cart}
              </span>
              {totalCount > 0 && (
                <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-white text-quantum text-[11px] font-bold px-1 shadow-sm">
                  {totalCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Compact Mobile Search Dropdown */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-border animate-fadeIn">
            <SearchBar autoFocus onSearch={() => setMobileSearchOpen(false)} />
          </div>
        )}
      </div>
    </header>

    {/* Mobile Drawer Navigation (Rendered into document.body via Portal to prevent backdrop-blur containing block clipping) */}
    {mobileMenuOpen && typeof document !== 'undefined' &&
      createPortal(
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <div
            className="relative w-[85vw] max-w-xs bg-surface h-full shadow-2xl flex flex-col z-10 animate-slideRight overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-surface-alt flex-shrink-0">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 group flex-shrink-0 min-w-0"
              >
                <img
                  src={logoIcon}
                  alt="QuantumTech Logo"
                  className="h-8 w-8 object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold tracking-tight text-ink leading-none whitespace-nowrap">
                    Quantum<span className="text-quantum">Tech</span>
                  </span>
                  <span className="caption-5 text-muted mt-0.5">
                    {language === 'bn' ? 'স্মার্ট এক্সেসরিজ' : 'Modern Accessories'}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                {/* Language Switcher inside Drawer */}
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="flex items-center justify-center px-2 py-1 rounded-lg border border-border bg-surface text-xs font-semibold text-ink hover:bg-surface-muted transition-colors"
                  aria-label={`Switch language: ${language === 'en' ? 'Bangla' : 'English'}`}
                >
                  <span className={language === 'en' ? 'text-quantum font-bold' : 'text-muted'}>EN</span>
                  <span className="text-border-dark mx-0.5">/</span>
                  <span className={language === 'bn' ? 'text-quantum font-bold' : 'text-muted'}>বাং</span>
                </button>

                <button
                  type="button"
                  data-testid="mobile-drawer-close"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink hover:bg-surface rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Search inside Drawer */}
            <div className="p-3 border-b border-border bg-surface flex-shrink-0">
              <SearchBar autoFocus={false} onSearch={() => setMobileMenuOpen(false)} />
            </div>

            {/* Scrollable Nav Links & Categories */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Main Nav Links */}
              <div className="flex flex-col gap-1">
                <NavLink
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.store} className="h-4 w-4" />
                  <span>{t.nav.home}</span>
                </NavLink>

                <NavLink
                  to="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.category} className="h-4 w-4" />
                  <span>{t.nav.shop}</span>
                </NavLink>

                <NavLink
                  to="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={Icons.cart} className="h-4 w-4" />
                    <span>{t.cart.title || 'Your Cart'}</span>
                  </div>
                  {totalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-quantum text-white text-xs font-bold shadow-xs">
                      {totalCount}
                    </span>
                  )}
                </NavLink>

                <NavLink
                  to="/track-order"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.delivery} className="h-4 w-4" />
                  <span>{t.nav.trackOrder}</span>
                </NavLink>

                <NavLink
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.user} className="h-4 w-4" />
                  <span>{t.nav.account}</span>
                </NavLink>

                <NavLink
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.user} className="h-4 w-4" />
                  <span>{t.nav.about}</span>
                </NavLink>

                <NavLink
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.phone} className="h-4 w-4" />
                  <span>{t.nav.contact}</span>
                </NavLink>

                <NavLink
                  to="/policies"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.shield} className="h-4 w-4" />
                  <span>{t.nav.policies}</span>
                </NavLink>

                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-quantum text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted hover:text-quantum'
                    }`
                  }
                >
                  <FontAwesomeIcon icon={Icons.dashboard} className="h-4 w-4 text-quantum" />
                  <span className="font-semibold text-quantum">{t.nav.admin}</span>
                </NavLink>
              </div>

              {/* Categories Section in Drawer */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="caption-4 uppercase font-bold text-muted tracking-wider">
                    {t.catalog.categories}
                  </span>
                  <Link
                    to="/shop"
                    onClick={() => setMobileMenuOpen(false)}
                    className="caption-5 font-bold text-quantum hover:underline"
                  >
                    {t.catalog.viewAll}
                  </Link>
                </div>
                <div className="flex flex-col gap-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-ink hover:bg-quantum-soft hover:text-quantum transition-colors group"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-surface-alt border border-border text-muted group-hover:text-quantum group-hover:border-quantum/30">
                        <FontAwesomeIcon icon={getCatIcon(cat.iconName)} className="h-3 w-3" />
                      </div>
                      <span>{language === 'bn' ? cat.nameBn : cat.nameEn}</span>
                    </Link>
                  ))}
                </div>
              </div>
              {/* Appearance / Theme Switcher in Drawer */}
              <div className="pt-3 border-t border-border">
                <ThemeToggle variant="row" />
              </div>
            </div>

            {/* Bottom Support Callouts */}
            <div className="p-4 border-t border-border bg-surface-alt flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center justify-between text-xs font-semibold text-ink">
                <span>{language === 'bn' ? 'সাপোর্ট হটলাইন' : 'Customer Support'}</span>
                <span className="caption-5 text-muted">10 AM - 10 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="tel:01712345678"
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-surface border border-border text-ink hover:text-quantum hover:border-quantum/30 text-xs font-bold shadow-xs transition-colors"
                >
                  <FontAwesomeIcon icon={Icons.phone} className="text-quantum h-3.5 w-3.5" />
                  <span>01712-345678</span>
                </a>
                <a
                  href="https://wa.me/8801712345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-9 w-9 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs"
                  title="WhatsApp Support"
                >
                  <FontAwesomeIcon icon={Icons.whatsapp} className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
