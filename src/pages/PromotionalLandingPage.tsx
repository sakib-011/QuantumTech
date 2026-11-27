import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { promotionService } from '../services/promotionService';
import { productService } from '../services/productService';
import { ProductCard } from '../components/ProductCard';
import { CampaignCountdownTimer } from '../components/CampaignCountdownTimer';
import { EmptyState } from '../components/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Icons } from '../utilities/icons';
import { Campaign, Product } from '../types';

export const PromotionalLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | undefined>(() =>
    promotionService.getCampaignBySlug(slug || '')
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [slug]);

  useEffect(() => {
    const handleSync = () => {
      const camp = promotionService.getCampaignBySlug(slug || '');
      setCampaign(camp);
    };
    window.addEventListener('quantum_campaigns_updated', handleSync);
    window.addEventListener('quantum_discounts_updated', handleSync);
    return () => {
      window.removeEventListener('quantum_campaigns_updated', handleSync);
      window.removeEventListener('quantum_discounts_updated', handleSync);
    };
  }, [slug]);

  useEffect(() => {
    if (campaign) {
      // Find all products covered by active discounts associated with this campaign
      const allProducts = productService.getProducts();
      const discounts = promotionService
        .getActiveDiscounts()
        .filter((d) => d.campaignId === campaign.id);

      let eligibleProductIds: string[] = [];
      discounts.forEach((d) => {
        if (d.targetType === 'all') {
          eligibleProductIds = allProducts.map((p) => p.id);
        } else if (d.targetType === 'category' && d.categoryIds) {
          const matchIds = allProducts
            .filter((p) => d.categoryIds?.includes(p.categoryId))
            .map((p) => p.id);
          eligibleProductIds.push(...matchIds);
        } else {
          eligibleProductIds.push(...d.productItems.map((pi) => pi.productId));
        }
      });

      const uniqueIds = Array.from(new Set(eligibleProductIds));
      const matched = allProducts.filter((p) => uniqueIds.includes(p.id));
      setProducts(matched.length > 0 ? matched : allProducts.slice(0, 8));

      // Track campaign visit
      promotionService.trackEvent('campaign_visit', {
        campaignId: campaign.id,
        pageUrl: window.location.pathname,
      });
    }
  }, [campaign]);

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <EmptyState
          icon={Icons.campaign}
          title={language === 'bn' ? 'ক্যাম্পেইন পাওয়া যায়নি' : 'Campaign Not Found'}
          description={
            language === 'bn'
              ? 'অনুরোধকৃত প্রমোশনাল অফারটি সমাপ্ত হয়েছে অথবা লিংকটি সঠিক নয়।'
              : 'The requested promotional festival campaign may have ended or been rescheduled.'
          }
          actionText={language === 'bn' ? 'সকল পণ্য দেখুন' : 'Explore Current Catalog'}
          onAction={() => navigate('/shop')}
        />
      </div>
    );
  }

  const campaignTitle = language === 'bn' && campaign.nameBn ? campaign.nameBn : campaign.name;
  const campaignDesc = language === 'bn' && campaign.descriptionBn ? campaign.descriptionBn : campaign.description;

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(true);
    showToast(`Coupon code ${code} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCoupon(false), 3000);
  };

  const campaignFaqs = [
    {
      q: language === 'bn' ? 'অফার চলাকালীন ক্যাশ অন ডেলিভারি প্রযোজ্য?' : 'Is Cash on Delivery valid for festival discount deals?',
      a: language === 'bn'
        ? 'হ্যাঁ! সব ক্যাম্পেইন প্রডাক্টের ক্ষেত্রে সারাদেশে ক্যাশ অন ডেলিভারি সম্পূর্ণ প্রযোজ্য।'
        : 'Yes! All promotional items are eligible for 100% Cash on Delivery across all 64 districts in Bangladesh.',
    },
    {
      q: language === 'bn' ? 'ডিসকাউন্টের সাথে কুপন কোড ব্যবহার করা যাবে?' : 'Can I apply a coupon code with campaign discounted products?',
      a: language === 'bn'
        ? 'হ্যাঁ, চেকআউটে প্রযোজ্য কুপন কোড ইনপুট দিলে অতিরিক্ত ডিসকাউন্ট স্বয়ংক্রিয়ভাবে বাদ যাবে।'
        : 'Yes, entering a valid promotional coupon at checkout stacks an additional savings on top of eligible subtotal.',
    },
    {
      q: language === 'bn' ? 'ওয়ারেন্টি কি একই থাকবে?' : 'Do promotional items maintain the full 7-day replacement warranty?',
      a: language === 'bn'
        ? 'অবশ্যই! আমাদের প্রতিটি পণ্য আসল ও পরীক্ষিত। ক্যাম্পেইন অফারেও সম্পূর্ণ ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি বহাল থাকবে।'
        : 'Absolutely. Every gadget retains our standard 7-day hassle-free replacement warranty for any manufacturing defect.',
    },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* 1. CAMPAIGN HERO SECTION */}
      <section data-testid="campaign-hero" className="relative bg-ink text-white py-12 sm:py-20 border-b border-slate-800 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-quantum/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Copy Column */}
            <div className="lg:col-span-7 flex flex-col items-start gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="caption-3 px-3 py-1 rounded-full bg-quantum text-white font-bold uppercase tracking-wider shadow-sm">
                  {campaign.badgeText || campaign.occasion}
                </span>
                <span className="caption-3 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1.5">
                  <FontAwesomeIcon icon={Icons.check} className="h-3 w-3 text-emerald-400" />
                  <span>100% Genuine Lab-Tested Tech</span>
                </span>
              </div>

              <h1 className="heading-3 sm:heading-1 font-bold text-white tracking-tight leading-tight">
                {campaignTitle}
              </h1>

              <p className="body-2 text-slate-300 max-w-xl leading-relaxed">
                {campaignDesc}
              </p>

              {/* Countdown Timer */}
              {campaign.showCountdown && campaign.endDate && (
                <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-float mt-2 inline-block">
                  <CampaignCountdownTimer
                    targetDate={campaign.endDate}
                    label={language === 'bn' ? 'অফার শেষ হতে বাকি:' : 'Limited Time Flash Offer Ends In:'}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-3">
                <a
                  href="#deals-grid"
                  className="btn-base bg-quantum text-white hover:bg-quantum-hover button-lg shadow-sm h-12 px-7 text-center font-bold"
                >
                  <FontAwesomeIcon icon={Icons.cart} className="h-4 w-4 mr-2" />
                  <span>{campaign.customCtaText || 'Claim Campaign Deals'}</span>
                </a>

                <Link
                  to="/shop"
                  className="btn-base bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 button-md h-12 px-5 text-center font-semibold"
                >
                  <span>Browse All Products</span>
                </Link>
              </div>

              {/* Social Proof Line */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800/80 w-full text-xs text-slate-400">
                <div className="flex text-amber-400 text-xs">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FontAwesomeIcon key={i} icon={Icons.star} className="h-3 w-3" />
                  ))}
                </div>
                <span>Rated 4.8/5 by 2,500+ customers across Bangladesh</span>
              </div>
            </div>

            {/* Visual Column */}
            <div className="lg:col-span-5 relative w-full">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl w-full h-[280px] sm:h-[340px] lg:h-[400px] flex items-center justify-center">
                {!imgError ? (
                  <img
                    src={campaign.campaignImage || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80'}
                    alt={campaignTitle}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-8 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-quantum/20 border border-quantum/40 flex items-center justify-center mb-4 text-quantum">
                      <FontAwesomeIcon icon={Icons.shield} className="h-8 w-8 text-quantum" />
                    </div>
                    <p className="heading-4 font-bold text-white mb-1">{campaignTitle}</p>
                    <p className="caption-2 text-slate-400">QuantumTech Verified Hardware Guarantee</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent dark:from-[#121212]/95 dark:via-[#121212]/40 flex flex-col justify-end p-6 pointer-events-none">
                  <span className="caption-3 px-2.5 py-1 rounded bg-amber-500 text-ink font-bold inline-flex items-center gap-1.5 w-fit mb-2 shadow-xs">
                    <FontAwesomeIcon icon={Icons.check} className="h-2.5 w-2.5" />
                    <span>Verified Campaign Offer</span>
                  </span>
                  <p className="title-3 text-white font-semibold">
                    Rigorously tested voltage, wattage, and durability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FESTIVAL COUPON VOUCHER STRIP */}
      <section data-testid="campaign-voucher-strip" className="bg-surface-alt border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.ticket} className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="title-3 font-bold text-ink">Exclusive Festival Coupon: EID20</h3>
                  <span className="caption-4 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    Active
                  </span>
                </div>
                <p className="caption-3 text-muted mt-0.5">
                  Get 20% extra discount on orders above ৳1,500. Enter code at checkout.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCoupon('EID20')}
              className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm font-semibold shadow-xs flex items-center gap-2 whitespace-nowrap"
            >
              <FontAwesomeIcon icon={copiedCoupon ? Icons.check : Icons.copy} className="h-3.5 w-3.5" />
              <span>{copiedCoupon ? 'Code Copied!' : 'Copy Code EID20'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. CAMPAIGN PRODUCTS GRID */}
      <section id="deals-grid" className="py-12 sm:py-16 bg-surface border-b border-border scroll-mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="caption-3 px-2.5 py-1 rounded bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
                Curated Deals
              </span>
              <h2 className="heading-4 sm:heading-3 font-bold text-ink">
                {language === 'bn' ? 'ক্যাম্পেইনের নির্বাচিত গ্যাজেটস' : 'Discounted Festival Hardware'}
              </h2>
              <p className="body-4 text-muted mt-1">
                Prices already reflect promotional campaign markdowns with nationwide Cash on Delivery.
              </p>
            </div>

            <Link
              to="/shop"
              className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm shadow-sm"
            >
              <span>View Full Catalog</span>
              <FontAwesomeIcon icon={Icons.arrowRight} className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRUST PILLARS & GUARANTEE */}
      <section className="py-12 bg-surface-alt border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.delivery} className="h-6 w-6" />
              </div>
              <div>
                <h4 className="title-3 font-bold text-ink mb-1">Nationwide Express Delivery</h4>
                <p className="caption-3 text-muted leading-relaxed">
                  1-2 days inside Dhaka (৳70) and 2-4 days anywhere across Bangladesh (৳130) with courier tracking.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.cod} className="h-6 w-6" />
              </div>
              <div>
                <h4 className="title-3 font-bold text-ink mb-1">100% Cash on Delivery</h4>
                <p className="caption-3 text-muted leading-relaxed">
                  Zero advance payment required. Pay only after your parcel arrives safely at your doorstep.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.returns} className="h-6 w-6" />
              </div>
              <div>
                <h4 className="title-3 font-bold text-ink mb-1">7-Day Replacement Guarantee</h4>
                <p className="caption-3 text-muted leading-relaxed">
                  Encounter any manufacturing defect? We swap it out swiftly with zero hassle or runaround.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-12 sm:py-16 bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-bold uppercase tracking-wider mb-2 inline-block">
              Campaign FAQ
            </span>
            <h2 className="heading-4 sm:heading-3 font-bold text-ink">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {campaignFaqs.map((faq, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-surface-alt border border-border">
                <h4 className="title-3 font-bold text-ink mb-2">{faq.q}</h4>
                <p className="body-4 text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="py-14 sm:py-20 bg-surface border-t border-border text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 relative z-10 flex flex-col items-center gap-4">
          <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-bold uppercase tracking-wider">
            Do Not Miss Out
          </span>
          <h2 className="heading-3 sm:heading-2 font-bold text-ink">
            Upgrade Your Tech Setup Today
          </h2>
          <p className="body-3 text-muted max-w-lg">
            High efficiency charging, studio audio, and long lasting power banks delivered nationwide.
          </p>
          <a
            href="#deals-grid"
            className="btn-base bg-quantum text-white hover:bg-quantum-hover button-lg font-bold px-8 py-3 rounded-xl shadow-sm mt-2"
          >
            Claim Campaign Deals Now
          </a>
        </div>
      </section>
    </div>
  );
};
