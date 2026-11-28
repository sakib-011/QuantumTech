import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Breadcrumb } from '../components/Breadcrumb';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { settingsService } from '../services/settingsService';
import logoIcon from '../assets/brand/logo-icon.png';
import heroBanner from '../assets/brand/hero-banner.png';

export const AboutPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [settings, setSettings] = useState(() => settingsService.getSettings());

  useEffect(() => {
    const handleSync = () => setSettings(settingsService.getSettings());
    window.addEventListener('quantum_settings_updated', handleSync);
    return () => window.removeEventListener('quantum_settings_updated', handleSync);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: t.nav.about }]} />

      <div className="max-w-4xl mx-auto mt-6">
        {/* Header Introduction */}
        <div className="text-center mb-12">
          <img
            src={logoIcon}
            alt="QuantumTech"
            className="h-16 w-16 mx-auto object-contain mb-4 drop-shadow-sm"
          />
          <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
            {t.about.badge}
          </span>
          <h1 className="heading-4 sm:heading-2 font-bold text-ink">
            {t.about.title}
          </h1>
          <p className="body-2 text-muted mt-2 max-w-2xl mx-auto italic">
            "{language === 'bn' && settings.taglineBn ? settings.taglineBn : settings.tagline}"
          </p>
        </div>

        {/* Feature Brand Showcase Banner */}
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm mb-12 bg-surface">
          <img
            src={heroBanner}
            alt="QuantumTech tech accessories lineup"
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Brand Story Section */}
        <div className="mb-12 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
          <h2 className="title-1 font-bold text-ink mb-4 pb-2 border-b border-border flex items-center gap-2">
            <FontAwesomeIcon icon={Icons.lightning} className="h-4 w-4 text-quantum" />
            <span>{t.about.storyTitle}</span>
          </h2>

          <div className="prose prose-slate max-w-none text-slate-700 body-2 space-y-4 leading-relaxed">
            <p>{t.about.story1}</p>
            <p>{t.about.story2}</p>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mb-12 bg-gradient-to-br from-quantum-soft/80 to-surface p-6 sm:p-8 rounded-2xl border border-quantum/20 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-quantum text-white text-xs font-bold uppercase tracking-wider mb-3">
            <FontAwesomeIcon icon={Icons.shield} className="h-3 w-3" />
            <span>{t.about.missionTitle}</span>
          </div>

          <h2 className="heading-5 sm:heading-4 font-bold text-ink mb-3">
            {t.about.missionHeadline}
          </h2>

          <p className="body-2 text-slate-700 leading-relaxed">
            {t.about.missionText}
          </p>
        </div>

        {/* Why Choose QuantumTech? (4 Core Pillars) */}
        <div className="mb-12">
          <h2 className="title-1 font-bold text-ink mb-6 text-center">
            {t.about.whyTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.shield} className="h-6 w-6" />
              </div>
              <div>
                <h3 className="title-3 font-bold text-ink mb-1">
                  {t.about.pillars.testedTitle}
                </h3>
                <p className="caption-2 text-muted leading-relaxed">
                  {t.about.pillars.testedDesc}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.cod} className="h-6 w-6" />
              </div>
              <div>
                <h3 className="title-3 font-bold text-ink mb-1">
                  {t.trust.codTitle}
                </h3>
                <p className="caption-2 text-muted leading-relaxed">
                  {t.trust.codDesc}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.returns} className="h-6 w-6" />
              </div>
              <div>
                <h3 className="title-3 font-bold text-ink mb-1">
                  {t.about.pillars.supportTitle}
                </h3>
                <p className="caption-2 text-muted leading-relaxed">
                  {t.about.pillars.supportDesc}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={Icons.delivery} className="h-6 w-6" />
              </div>
              <div>
                <h3 className="title-3 font-bold text-ink mb-1">
                  {t.about.pillars.speedTitle}
                </h3>
                <p className="caption-2 text-muted leading-relaxed">
                  {t.about.pillars.speedDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center p-8 bg-surface rounded-2xl border border-border shadow-sm">
          <h3 className="title-1 font-bold text-ink mb-2">
            {t.about.ctaTitle}
          </h3>
          <p className="body-3 text-muted mb-6 max-w-md mx-auto">
            {t.about.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/contact"
              className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={Icons.phone} className="h-4 w-4" />
              <span>{t.about.contactBtn}</span>
            </Link>
            <Link
              to="/shop"
              className="btn-base bg-surface-alt border border-border text-ink hover:bg-surface-muted button-md w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={Icons.store} className="h-4 w-4 text-quantum" />
              <span>{t.about.shopBtn}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
