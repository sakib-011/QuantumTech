import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLanguage } from '../context/LanguageContext';
import { ProductGrid } from '../components/ProductGrid';
import { CategoryCard } from '../components/CategoryCard';
import { TaglineReveal } from '../components/TaglineReveal';
import { Icons } from '../utilities/icons';
import { productService } from '../services/productService';
import { reviewService } from '../services/reviewService';
import { categoryService } from '../services/categoryService';
import { settingsService } from '../services/settingsService';
import { promotionService } from '../services/promotionService';
import { CampaignFeaturedSection } from '../components/CampaignFeaturedSection';
import { Product, Review, StoreSettings, Campaign } from '../types';
import heroBannerImg from '../assets/brand/hero-banner.png';

export const HomePage: React.FC = () => {
  const { language, t } = useLanguage();

  // Centralized real-time products, categories, reviews & campaigns from service layer
  const [products, setProducts] = useState<Product[]>(() => productService.getProducts());
  const [categories, setCategories] = useState(() => categoryService.getCategories().filter(c => c.status === 'Visible'));
  const [approvedReviews, setApprovedReviews] = useState<Review[]>(() => reviewService.getApprovedReviews());
  const [settings, setSettings] = useState<StoreSettings>(() => settingsService.getSettings());
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>(() => promotionService.getActiveCampaigns());

  useEffect(() => {
    const handleSync = () => {
      setProducts(productService.getProducts());
      setCategories(categoryService.getCategories().filter(c => c.status === 'Visible'));
      setApprovedReviews(reviewService.getApprovedReviews());
      setSettings(settingsService.getSettings());
      setActiveCampaigns(promotionService.getActiveCampaigns());
    };
    window.addEventListener('quantum_products_updated', handleSync);
    window.addEventListener('quantum_categories_updated', handleSync);
    window.addEventListener('quantum_reviews_updated', handleSync);
    window.addEventListener('quantum_settings_updated', handleSync);
    window.addEventListener('quantum_campaigns_updated', handleSync);
    window.addEventListener('quantum_discounts_updated', handleSync);
    return () => {
      window.removeEventListener('quantum_products_updated', handleSync);
      window.removeEventListener('quantum_categories_updated', handleSync);
      window.removeEventListener('quantum_reviews_updated', handleSync);
      window.removeEventListener('quantum_settings_updated', handleSync);
      window.removeEventListener('quantum_campaigns_updated', handleSync);
      window.removeEventListener('quantum_discounts_updated', handleSync);
    };
  }, []);

  const newArrivals = products.filter(p => p.isNew).slice(0, 4);
  const featured = products.filter(p => p.isFeatured);
  const featuredProducts = featured.length > 0 ? featured.slice(0, 8) : products.slice(0, 8);

  // Dynamic Campaigns
  const featuredCampaign = activeCampaigns.find((c) => c.bannerPosition === 'featured');
  const middleCampaign = activeCampaigns.find((c) => c.bannerPosition === 'middle');

  const faqs = [
    {
      q: language === 'bn' ? 'ডেলিভারি পেতে কতদিন সময় লাগবে?' : 'How long does delivery take across Bangladesh?',
      a: language === 'bn' 
        ? 'ঢাকার ভিতরে সাধারণত ১ থেকে ২ কার্যদিবস (৳৭০) এবং ঢাকার বাইরে ২ থেকে ৪ কার্যদিবসের (৳১৩০) মধ্যে আপনার ঠিকানায় ডেলিভারি পৌঁছে দেওয়া হয়।'
        : 'Orders inside Dhaka are typically delivered within 1-2 business days (৳70). Outside Dhaka delivery takes 2-4 business days (৳130) via registered couriers.',
    },
    {
      q: language === 'bn' ? 'ক্যাশ অন ডেলিভারিতে কি অর্ডার করা যাবে?' : 'Is Cash on Delivery supported?',
      a: language === 'bn'
        ? 'হ্যাঁ, সারাদেশে সম্পূর্ণ ক্যাশ অন ডেলিভারি সুবিধা রয়েছে। পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধ করতে পারবেন।'
        : 'Yes, Cash on Delivery is available nationwide across all districts. You only pay when your parcel is physically handed over at your doorstep.',
    },
    {
      q: language === 'bn' ? 'বিকাশ বা নগদে কীভাবে পেমেন্ট করব?' : 'How do I pay with bKash or Nagad?',
      a: language === 'bn'
        ? 'চেকআউটে বিকাশ বা নগদ নির্বাচন করলে আমাদের নম্বর দেখতে পাবেন। আপনার অ্যাপ থেকে সেন্ড মানি করে প্রাপ্ত TrxID ও নম্বর ইনপুট দিলেই অর্ডার সংরক্ষিত হবে।'
        : 'Select bKash or Nagad at checkout to view our account number. Send money from your personal app, then enter your sender number and Transaction ID (TrxID).',
    },
    {
      q: language === 'bn' ? 'কোনো পণ্য ত্রুটিপূর্ণ হলে রিটার্ন করা যাবে?' : 'What is your return and warranty policy?',
      a: language === 'bn'
        ? 'আমরা ৭ দিনের সহজ রিপ্লেসমেন্ট ওয়ারেন্টি প্রদান করি। যেকোনো উৎপাদন ত্রুটির ক্ষেত্রে আমাদের সাথে যোগাযোগ করলে দ্রুত পরিবর্তন করে দেওয়া হয়।'
        : 'We offer a 7-day hassle-free replacement warranty for any manufacturing defect. Simply contact support with your order number for an immediate replacement.',
    },
    {
      q: language === 'bn' ? 'অর্ডার করতে কি অ্যাকাউন্ট খোলা বাধ্যতামূলক?' : 'Do I need an account to place an order?',
      a: language === 'bn'
        ? 'না! অ্যাকাউন্ট খোলার কোনো ঝামেলা নেই। শুধুমাত্র আপনার নাম, মোবাইল নম্বর এবং ঠিকানা দিয়ে ২ মিনিটের মধ্যেই গেস্ট চেকআউট সম্পন্ন করতে পারবেন।'
        : 'No account registration is needed! We support fast guest checkout where you simply enter your name, phone, and address in under 2 minutes.',
    },
    {
      q: language === 'bn' ? 'আমার অর্ডার কীভাবে ট্র্যাক করব?' : 'How do I track my active order?',
      a: language === 'bn'
        ? 'ওয়েবসাইটের "অর্ডার ট্র্যাক" পেজে গিয়ে আপনার অর্ডার নম্বর (যেমন: QT-261119-024) এবং নিবন্ধিত মোবাইল নম্বর দিলেই লাইভ স্ট্যাটাস দেখতে পাবেন।'
        : 'Visit our Track Order page, enter your order number (e.g. QT-261119-024) and your phone number to view live progress from Confirmed to Delivered.',
    },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative bg-surface py-10 sm:py-16 lg:py-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Copy Column */}
            <div className="lg:col-span-7 flex flex-col items-start max-w-[680px]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-quantum-soft text-quantum caption-3 font-semibold mb-4 sm:mb-6">
                <FontAwesomeIcon icon={Icons.lightning} className="h-3 w-3" />
                <span>
                  {language === 'bn'
                    ? (settings.heroBadgeTextBn || settings.heroBadgeText || t.hero.badge)
                    : (settings.heroBadgeText || t.hero.badge)}
                </span>
              </div>

              <h1 className="heading-3 sm:heading-1 font-bold tracking-tight text-ink mb-4 sm:mb-6 leading-tight">
                <span className="hero-gradient-text-light block">
                  {language === 'bn'
                    ? (settings.heroTitleLine1Bn || settings.heroTitleLine1 || 'সেরা গ্যাজেট।')
                    : (settings.heroTitleLine1 || 'Gear up.')}
                </span>
                <span className="text-quantum block">
                  {language === 'bn'
                    ? (settings.heroTitleLine2Bn || settings.heroTitleLine2 || 'দ্রুত চার্জিং।')
                    : (settings.heroTitleLine2 || 'Charge fast.')}
                </span>
              </h1>

              <p className="body-2 text-muted mb-6 sm:mb-8 max-w-[560px]">
                {language === 'bn'
                  ? (settings.heroSubtitleBn || settings.heroSubtitle || t.hero.subtitle)
                  : (settings.heroSubtitle || t.hero.subtitle)}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-6 sm:mb-8">
                <Link
                  to={settings.heroPrimaryCtaLink || '/shop'}
                  className="btn-base bg-quantum text-white hover:bg-quantum-hover button-lg shadow-sm h-12 px-7 text-center min-h-[44px]"
                >
                  <FontAwesomeIcon icon={Icons.cart} className="h-4 w-4" />
                  <span>
                    {language === 'bn'
                      ? (settings.heroPrimaryCtaTextBn || settings.heroPrimaryCtaText || t.hero.shopNow)
                      : (settings.heroPrimaryCtaText || t.hero.shopNow)}
                  </span>
                </Link>

                <Link
                  to={settings.heroSecondaryCtaLink || '/shop'}
                  className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-md h-12 px-5 text-center min-h-[44px]"
                >
                  <FontAwesomeIcon icon={Icons.category} className="h-4 w-4 text-muted" />
                  <span>
                    {language === 'bn'
                      ? (settings.heroSecondaryCtaTextBn || settings.heroSecondaryCtaText || t.hero.browseCategories)
                      : (settings.heroSecondaryCtaText || t.hero.browseCategories)}
                  </span>
                </Link>
              </div>

              {/* Social Proof Line */}
              <div className="flex items-center gap-3 pt-4 border-t border-border w-full">
                <div className="flex text-amber-400 text-xs">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FontAwesomeIcon key={i} icon={Icons.star} className="h-3.5 w-3.5" />
                  ))}
                </div>
                <span className="caption-2 text-muted">
                  <strong className="text-ink font-semibold">
                    {settings.heroRatingScore || '4.8 / 5 Rating'}
                  </strong>{' '}
                  {language === 'bn'
                    ? (settings.heroRatingTextBn || settings.heroRatingText || 'সারাদেশে ২,৫০০+ সন্তুষ্ট ক্রেতা')
                    : (settings.heroRatingText || 'from 2,500+ buyers across Bangladesh')}
                </span>
              </div>
            </div>

            {/* Visual Column */}
            <div className="lg:col-span-5 relative w-full">
              <div className="relative rounded-2xl overflow-hidden border border-border bg-slate-900 dark:bg-[#181818] shadow-float group">
                <img
                  src={settings.heroBannerImage || heroBannerImg}
                  alt={settings.storeName || "QuantumTech premium tech accessories showcase"}
                  className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-500 ease-brand"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent dark:from-[#121212]/95 dark:via-[#121212]/40 flex flex-col justify-end p-5 sm:p-6">
                  <span className="caption-3 px-2.5 py-1 rounded bg-quantum text-white inline-block w-fit mb-1 font-semibold">
                    {language === 'bn'
                      ? (settings.heroBannerBadgeBn || settings.heroBannerBadge || '১০০% জেনুইন টেক')
                      : (settings.heroBannerBadge || '100% Genuine Tech')}
                  </span>
                  <p className="title-3 text-white font-semibold">
                    {language === 'bn'
                      ? (settings.heroBannerTaglineBn || settings.heroBannerTagline || 'আপনার জন্য সেরা টেক এক্সেসরিজ আমরাই নিশ্চিত করি।')
                      : (settings.heroBannerTagline || 'We find the tech so you do not have to.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY SECTION */}
      <section className="py-10 sm:py-14 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="heading-5 font-bold text-ink">{t.catalog.categories}</h2>
              <p className="caption-1 text-muted mt-0.5">
                {language === 'bn' ? 'আপনার প্রয়োজনীয় গ্যাজেট বিভাগ বাছাই করুন' : 'Browse verified tech by accessory category'}
              </p>
            </div>
            <Link
              to="/shop"
              className="caption-1 text-quantum font-semibold hover:underline flex items-center gap-1.5"
            >
              <span>{t.catalog.viewAll}</span>
              <FontAwesomeIcon icon={Icons.arrowRight} className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC FEATURED CAMPAIGN / FESTIVAL BANNER (Placed right below Categories) */}
      {featuredCampaign && (
        <CampaignFeaturedSection campaign={featuredCampaign} />
      )}

      {/* 3. NEW ARRIVALS SECTION */}
      <section className="py-12 sm:py-16 bg-surface-alt border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="caption-3 px-2.5 py-1 rounded bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
                Just Landed
              </span>
              <h2 className="heading-4 sm:heading-3 text-ink font-bold">{t.catalog.newArrivals}</h2>
              <p className="body-4 text-muted mt-1">
                {language === 'bn' ? 'সর্বশেষ প্রযুক্তির নতুন সংযোজন' : 'Latest released chargers, earbuds and smart hardware'}
              </p>
            </div>

            <Link
              to="/shop"
              className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm shadow-sm"
            >
              <span>{t.catalog.viewAll}</span>
              <FontAwesomeIcon icon={Icons.arrowRight} className="h-3 w-3" />
            </Link>
          </div>

          <ProductGrid products={newArrivals} />
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS SECTION */}
      <section className="py-12 sm:py-16 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="caption-3 px-2.5 py-1 rounded bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
                Top Rated Picks
              </span>
              <h2 className="heading-4 sm:heading-3 text-ink font-bold">{t.catalog.featuredProducts}</h2>
              <p className="body-4 text-muted mt-1">
                {language === 'bn' ? 'সবচেয়ে জনপ্রিয় এবং সর্বাধিক বিক্রিত গ্যাজেটস' : 'Customer-favorite essentials tested for peak performance'}
              </p>
            </div>

            <Link
              to="/shop"
              className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm shadow-sm"
            >
              <span>{t.catalog.viewAll}</span>
              <FontAwesomeIcon icon={Icons.arrowRight} className="h-3 w-3" />
            </Link>
          </div>

          <ProductGrid products={featuredProducts} />
        </div>
      </section>

      {/* 5. PROMOTIONAL BANNER SECTION */}
      <section data-testid="promotional-banner" className="py-10 bg-surface-alt border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-slate-900 dark:bg-[#181818] text-white overflow-hidden p-6 sm:p-10 lg:p-12 border border-slate-800 shadow-float">
            {/* Ambient Background Glow */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-quantum/25 via-quantum/10 to-transparent pointer-events-none hidden sm:block" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 relative">
              {/* Left Column: Offer Details */}
              <div className="lg:col-span-7 flex flex-col items-start gap-4">
                <span className="caption-3 px-3 py-1 rounded-full bg-quantum text-white font-semibold uppercase tracking-wider shadow-sm">
                  {middleCampaign?.badgeText || 'Deal of the Week'}
                </span>

                <h2 className="heading-4 sm:heading-2 font-bold leading-tight">
                  {middleCampaign ? (language === 'bn' && middleCampaign.nameBn ? middleCampaign.nameBn : middleCampaign.name) : 'GaN 65W Multi-Port Desktop Fast Charger'}
                </h2>

                <p className="body-3 text-slate-300 max-w-xl leading-relaxed">
                  {middleCampaign ? (language === 'bn' && middleCampaign.descriptionBn ? middleCampaign.descriptionBn : middleCampaign.description) : 'Power your MacBook, iPad, and smartphone at the same time with advanced Gallium Nitride heat dissipation. Save 15% this week only.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                  <Link
                    to={middleCampaign?.landingPageSlug ? `/campaign/${middleCampaign.landingPageSlug}` : (middleCampaign?.customCtaLink || '/product/gan-65w-multi-port-desktop-fast-charger')}
                    className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm h-11 px-6 font-semibold"
                  >
                    <FontAwesomeIcon icon={Icons.cart} className="h-4 w-4 mr-1.5" />
                    <span>{middleCampaign?.customCtaText || 'Shop Deal • ৳2,750'}</span>
                  </Link>

                  <Link
                    to="/shop"
                    className="btn-base bg-slate-800 text-slate-200 hover:bg-slate-700 button-sm h-11 px-4 font-semibold border border-slate-700"
                  >
                    <span>Explore Catalog</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Featured Charger Product Visual */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-sm sm:max-w-md aspect-[4/3] rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl group">
                  <img
                    src={middleCampaign?.campaignImage || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'}
                    alt={middleCampaign?.name || 'GaN 65W Multi-Port Desktop Fast Charger'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-brand"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-4">
                    <div className="flex items-center justify-between w-full">
                      <span className="caption-3 px-2.5 py-1 rounded-lg bg-quantum text-white font-semibold shadow-sm">
                        {language === 'bn' ? '১৫% ছাড়' : 'Save 15%'}
                      </span>
                      <span className="caption-3 px-2.5 py-1 rounded-lg bg-slate-900/90 text-amber-300 font-mono font-bold border border-slate-700/80 shadow-xs">
                        ৳2,750
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE QUANTUMTECH? (Trust Pillars) */}
      <section className="py-12 sm:py-16 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
              {language === 'bn' ? 'আমাদের প্রতিশ্রুতি' : 'Why QuantumTech?'}
            </span>
            <h2 className="heading-4 sm:heading-3 font-bold text-ink">
              {language === 'bn' ? 'কেন কোয়ান্টাম টেক সেরা?' : 'Engineered for Trust and Speed'}
            </h2>
            <p className="body-4 text-muted mt-2">
              Every detail built to ensure zero risk from checkout to doorstep.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-surface-alt border border-border shadow-card flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-quantum-soft text-quantum mb-4">
                <FontAwesomeIcon icon={Icons.cod} className="h-6 w-6" />
              </div>
              <h3 className="title-2 text-ink font-semibold mb-2">{t.trust.codTitle}</h3>
              <p className="body-5 text-muted">{t.trust.codDesc}</p>
            </div>

            <div className="p-6 rounded-xl bg-surface-alt border border-border shadow-card flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-quantum-soft text-quantum mb-4">
                <FontAwesomeIcon icon={Icons.delivery} className="h-6 w-6" />
              </div>
              <h3 className="title-2 text-ink font-semibold mb-2">{t.trust.deliveryTitle}</h3>
              <p className="body-5 text-muted">{t.trust.deliveryDesc}</p>
            </div>

            <div className="p-6 rounded-xl bg-surface-alt border border-border shadow-card flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-quantum-soft text-quantum mb-4">
                <FontAwesomeIcon icon={Icons.returns} className="h-6 w-6" />
              </div>
              <h3 className="title-2 text-ink font-semibold mb-2">{t.trust.returnsTitle}</h3>
              <p className="body-5 text-muted">{t.trust.returnsDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mandatory Tagline Reveal Section (Skill B11) */}
      <TaglineReveal className="bg-surface-alt border-b border-border" />

      {/* 7. BRAND STORY SECTION */}
      <section className="py-12 sm:py-16 bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
            Our Purpose
          </span>
          <h2 className="heading-4 sm:heading-3 font-bold text-ink mb-4">
            {language === 'bn' ? 'প্রযুক্তির নির্ভরযোগ্য সন্ধান' : 'Finding the Tech so You Don’t Have to'}
          </h2>
          <p className="body-2 text-muted leading-relaxed mb-6">
            {language === 'bn'
              ? 'কোয়ান্টাম টেক কোনো সাধারণ রিসেলার নয়। আমরা বাজারে প্রচলিত প্রতিটি চার্জার, কেবল এবং পাওয়ার ব্যাংক ল্যাব টেস্ট করে সত্য রেটিং ও স্থায়িত্ব নিশ্চিত করার পর আপনাদের জন্য সরবরাহ করি।'
              : 'QuantumTech was created to end the frustration of fake cables, overheating power bricks, and exaggerated battery specs. Every gadget in our catalog undergoes rigorous bench testing before it reaches your hands.'}
          </p>
          <Link
            to="/about"
            className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm shadow-sm"
          >
            <FontAwesomeIcon icon={Icons.user} className="h-3.5 w-3.5 text-quantum" />
            <span>Read Our Full Story</span>
          </Link>
        </div>
      </section>

      {/* 8. CUSTOMER REVIEWS (Approved Sample Reviews Only) */}
      <section className="py-12 sm:py-16 bg-surface-alt border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <span className="caption-3 px-2.5 py-1 rounded bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
                Customer Voices
              </span>
              <h2 className="heading-4 sm:heading-3 font-bold text-ink">
                {language === 'bn' ? 'গ্রাহকদের মতামত' : 'Real Reviews from Real Tech Enthusiasts'}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <FontAwesomeIcon icon={Icons.circleCheck} className="text-success h-4 w-4" />
              <span>Verified deliveries in Dhaka and beyond</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approvedReviews.slice(0, 3).map((review) => (
              <div
                key={review.id}
                className="p-6 rounded-xl border border-border bg-surface shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex text-amber-400 mb-3">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <FontAwesomeIcon key={i} icon={Icons.star} className="h-3.5 w-3.5" />
                    ))}
                  </div>
                  <p className="body-4 text-ink mb-4 font-normal">
                    "{review.comment}"
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="title-4 font-semibold text-ink block">{review.reviewerName}</span>
                    <span className="caption-5 text-muted block mt-0.5">{review.productName}</span>
                  </div>
                  <span className="caption-5 text-success font-semibold px-2 py-0.5 rounded bg-success-soft">
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-12 sm:py-16 bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
              Frequently Asked Questions
            </span>
            <h2 className="heading-4 sm:heading-3 font-bold text-ink">
              {language === 'bn' ? 'সাধারণ জিজ্ঞাসা' : 'Got Questions? We Have Answers.'}
            </h2>
            <p className="body-4 text-muted mt-2">
              Everything you need to know about deliveries, payment and warranties.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-border bg-surface-alt shadow-card"
              >
                <h3 className="title-3 font-semibold text-ink mb-2">
                  {faq.q}
                </h3>
                <p className="body-5 text-muted leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
