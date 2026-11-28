import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { categoryService } from '../services/categoryService';
import { settingsService } from '../services/settingsService';
import logoIcon from '../assets/brand/logo-icon.png';

export const Footer: React.FC = () => {
  const { language, t } = useLanguage();
  const [storeSettings, setStoreSettings] = useState(() => settingsService.getSettings());
  const [categories, setCategories] = useState(() => 
    categoryService.getCategories().filter(c => c.status === 'Visible')
  );

  useEffect(() => {
    const handleSync = () => setStoreSettings(settingsService.getSettings());
    const handleCatSync = () => setCategories(categoryService.getCategories().filter(c => c.status === 'Visible'));
    window.addEventListener('quantum_settings_updated', handleSync);
    window.addEventListener('quantum_categories_updated', handleCatSync);
    return () => {
      window.removeEventListener('quantum_settings_updated', handleSync);
      window.removeEventListener('quantum_categories_updated', handleCatSync);
    };
  }, []);

  const whatsappUrl = `https://wa.me/${storeSettings.whatsappNumber.replace(/[^0-9]/g, '')}`;

  return (
    <footer className="bg-ink dark:bg-[#121212] text-slate-300 border-t border-slate-800 dark:border-border mt-0">
      {/* Trust & Guarantee Highlights Bar */}
      <div className="border-b border-slate-800 dark:border-border py-6 sm:py-8 bg-slate-900/50 dark:bg-[#181818]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-quantum/15 dark:bg-quantum/25 text-quantum dark:text-sky-400 border border-quantum/20 dark:border-quantum/40 flex-shrink-0 shadow-xs">
                <FontAwesomeIcon icon={Icons.cod} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="title-4 text-white font-semibold text-xs sm:text-sm">{t.trust.codTitle}</h4>
                <p className="caption-4 text-slate-400 dark:text-slate-300 mt-0.5 leading-relaxed">{t.trust.codDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-quantum/15 dark:bg-quantum/25 text-quantum dark:text-sky-400 border border-quantum/20 dark:border-quantum/40 flex-shrink-0 shadow-xs">
                <FontAwesomeIcon icon={Icons.delivery} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="title-4 text-white font-semibold text-xs sm:text-sm">{t.trust.deliveryTitle}</h4>
                <p className="caption-4 text-slate-400 dark:text-slate-300 mt-0.5 leading-relaxed">{t.trust.deliveryDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-quantum/15 dark:bg-quantum/25 text-quantum dark:text-sky-400 border border-quantum/20 dark:border-quantum/40 flex-shrink-0 shadow-xs">
                <FontAwesomeIcon icon={Icons.returns} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="title-4 text-white font-semibold text-xs sm:text-sm">{t.trust.returnsTitle}</h4>
                <p className="caption-4 text-slate-400 dark:text-slate-300 mt-0.5 leading-relaxed">{t.trust.returnsDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-quantum/15 dark:bg-quantum/25 text-quantum dark:text-sky-400 border border-quantum/20 dark:border-quantum/40 flex-shrink-0 shadow-xs">
                <FontAwesomeIcon icon={Icons.shield} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="title-4 text-white font-semibold text-xs sm:text-sm">{t.trust.verifiedTitle}</h4>
                <p className="caption-4 text-slate-400 dark:text-slate-300 mt-0.5 leading-relaxed">{t.trust.verifiedDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Brand Introduction (Col 1-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logoIcon} alt="QuantumTech" className="h-9 w-9 sm:h-10 sm:w-10 object-contain flex-shrink-0" />
              <span className="text-xl font-bold tracking-tight text-white">
                Quantum<span className="text-quantum">Tech</span>
              </span>
            </Link>

            <p className="body-5 text-slate-400 leading-relaxed max-w-sm">
              {t.footer.aboutText}
            </p>

            {/* Social Links (Facebook, Instagram, WhatsApp, Messenger) */}
            <div className="flex items-center gap-2.5 mt-2">
              <a
                href={storeSettings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-quantum hover:text-white transition-colors"
                aria-label="QuantumTech on Facebook"
              >
                <FontAwesomeIcon icon={Icons.facebook} className="h-4 w-4" />
              </a>

              <a
                href={storeSettings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-quantum hover:text-white transition-colors"
                aria-label="QuantumTech on Instagram"
              >
                <FontAwesomeIcon icon={Icons.instagram} className="h-4 w-4" />
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white transition-colors"
                aria-label="Chat on WhatsApp"
              >
                <FontAwesomeIcon icon={Icons.whatsapp} className="h-4 w-4" />
              </a>

              <a
                href={storeSettings.messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
                aria-label="Chat on Facebook Messenger"
              >
                <FontAwesomeIcon icon={Icons.messenger} className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links (Col 5-6) */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h4 className="title-4 text-white font-semibold uppercase tracking-wider text-xs">
              {t.footer.quickLinks}
            </h4>
            <ul className="flex flex-col gap-2 list-none p-0 m-0 text-sm">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-slate-400 hover:text-white transition-colors">
                  {t.nav.shop}
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-slate-400 hover:text-white transition-colors">
                  {t.nav.trackOrder}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                  {t.nav.about}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                  {t.nav.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Product Categories (Col 7-9) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h4 className="title-4 text-white font-semibold uppercase tracking-wider text-xs">
              {t.footer.categories}
            </h4>
            <ul className="flex flex-col gap-2 list-none p-0 m-0 text-sm">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/category/${category.slug}`}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {language === 'bn' ? category.nameBn : category.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Support & Contact Info (Col 10-12) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h4 className="title-4 text-white font-semibold uppercase tracking-wider text-xs">
              {t.footer.customerCare}
            </h4>
            <div className="flex flex-col gap-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <FontAwesomeIcon icon={Icons.phone} className="h-3.5 w-3.5 text-quantum mt-0.5 flex-shrink-0" />
                <div>
                  <span className="block font-medium text-slate-300">Hotline &amp; Ordering</span>
                  <a href={`tel:${storeSettings.phone}`} className="hover:text-white transition-colors">
                    {storeSettings.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FontAwesomeIcon icon={Icons.email} className="h-3.5 w-3.5 text-quantum mt-0.5 flex-shrink-0" />
                <div>
                  <span className="block font-medium text-slate-300">Customer Email</span>
                  <a href={`mailto:${storeSettings.email}`} className="hover:text-white transition-colors">
                    {storeSettings.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FontAwesomeIcon icon={Icons.clock} className="h-3.5 w-3.5 text-quantum mt-0.5 flex-shrink-0" />
                <div>
                  <span className="block font-medium text-slate-300">Operating Hours</span>
                  <span>{storeSettings.businessHours}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FontAwesomeIcon icon={Icons.location} className="h-3.5 w-3.5 text-quantum mt-0.5 flex-shrink-0" />
                <div>
                  <span className="block font-medium text-slate-300">Store Address</span>
                  <span>{storeSettings.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Policies & Copyright Bottom Row */}
        <div className="mt-10 sm:mt-14 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {storeSettings.storeName}. {t.footer.copyright}</p>
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link to="/policies/delivery" className="hover:text-slate-300 transition-colors">
              {language === 'bn' ? 'ডেলিভারি পলিসি' : 'Delivery Policy'}
            </Link>
            <Link to="/policies/returns" className="hover:text-slate-300 transition-colors">
              {language === 'bn' ? 'রিটার্ন ও রিফান্ড পলিসি' : 'Return & Refund Policy'}
            </Link>
            <Link to="/policies/privacy" className="hover:text-slate-300 transition-colors">
              {language === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
