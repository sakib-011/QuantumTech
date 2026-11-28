import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { useLanguage } from '../context/LanguageContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';

interface PoliciesPageProps {
  defaultTab?: 'all' | 'delivery' | 'returns' | 'privacy';
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ defaultTab }) => {
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from prop, pathname, or hash
  const getInitialTab = (): 'all' | 'delivery' | 'returns' | 'privacy' => {
    if (defaultTab) return defaultTab;
    if (location.pathname.includes('/delivery') || location.hash === '#delivery') return 'delivery';
    if (location.pathname.includes('/returns') || location.hash === '#return' || location.hash === '#returns') return 'returns';
    if (location.pathname.includes('/privacy') || location.hash === '#privacy') return 'privacy';
    return 'all';
  };

  const activeTab = getInitialTab();

  const handleTabClick = (tab: 'all' | 'delivery' | 'returns' | 'privacy') => {
    if (tab === 'all') {
      navigate('/policies');
    } else {
      navigate(`/policies/${tab}`);
    }
  };

  // Scroll to top or specific section if needed
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const p = t.policies;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Breadcrumb
        items={[
          { label: t.nav.policies, href: '/policies' },
          ...(activeTab !== 'all'
            ? [
                {
                  label:
                    activeTab === 'delivery'
                      ? p.deliveryTab
                      : activeTab === 'returns'
                      ? p.returnsTab
                      : p.privacyTab,
                },
              ]
            : []),
        ]}
      />

      <div className="mt-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-4 sm:heading-3 font-bold text-ink mb-2">
            {p.title}
          </h1>
          <p className="body-4 text-muted">
            {p.subtitle}
          </p>
        </div>

        {/* Configurable Sample Content Disclaimer Banner */}
        <div className="mb-8 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 flex items-start gap-3">
          <FontAwesomeIcon icon={Icons.info} className="h-5 w-5 text-quantum mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold block mb-0.5 text-quantum">
              {language === 'bn' ? 'নমুনা ও ড্রাফট নীতিমালা বিজ্ঞপ্তি' : 'Configurable Sample Policy Notice'}
            </span>
            <p className="text-slate-700">
              {p.sampleNotice}
            </p>
          </div>
        </div>

        {/* Policy Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 border-b border-border scrollbar-none">
          <button
            type="button"
            onClick={() => handleTabClick('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-quantum text-white shadow-sm'
                : 'bg-surface hover:bg-surface-alt text-ink border border-border'
            }`}
          >
            <FontAwesomeIcon icon={Icons.category} className="mr-2 h-3.5 w-3.5" />
            {p.allTab}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('delivery')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'delivery'
                ? 'bg-quantum text-white shadow-sm'
                : 'bg-surface hover:bg-surface-alt text-ink border border-border'
            }`}
          >
            <FontAwesomeIcon icon={Icons.delivery} className="mr-2 h-3.5 w-3.5" />
            {p.deliveryTab}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('returns')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'returns'
                ? 'bg-quantum text-white shadow-sm'
                : 'bg-surface hover:bg-surface-alt text-ink border border-border'
            }`}
          >
            <FontAwesomeIcon icon={Icons.returns} className="mr-2 h-3.5 w-3.5" />
            {p.returnsTab}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('privacy')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-quantum text-white shadow-sm'
                : 'bg-surface hover:bg-surface-alt text-ink border border-border'
            }`}
          >
            <FontAwesomeIcon icon={Icons.shield} className="mr-2 h-3.5 w-3.5" />
            {p.privacyTab}
          </button>
        </div>

        {/* Policy Sections */}
        <div className="flex flex-col gap-8">
          {/* Delivery Policy */}
          {(activeTab === 'all' || activeTab === 'delivery') && (
            <section
              id="delivery"
              className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-card scroll-mt-24 transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-11 w-11 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                  <FontAwesomeIcon icon={Icons.delivery} className="h-5 w-5" />
                </div>
                <div>
                  <span className="caption-3 text-quantum font-semibold uppercase tracking-wider block">
                    {language === 'bn' ? 'ডেলিভারি সংক্রান্ত নিয়মাবলী' : 'Shipping Guidelines'}
                  </span>
                  <h2 className="title-1 font-bold text-ink">{p.deliveryTitle}</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-surface-alt border border-border flex flex-col gap-1.5">
                  <span className="caption-3 font-semibold text-quantum">
                    {language === 'bn' ? 'ঢাকার ভেতরে (Inside Dhaka)' : 'Inside Dhaka'}
                  </span>
                  <span className="heading-6 font-bold text-ink">৳70 BDT</span>
                  <p className="caption-3 text-muted">
                    {language === 'bn' ? '১ থেকে ২ কার্যদিবসের মধ্যে দ্রুত ডেলিভারি' : 'Estimated 24 to 48 hours delivery'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-alt border border-border flex flex-col gap-1.5">
                  <span className="caption-3 font-semibold text-quantum">
                    {language === 'bn' ? 'ঢাকার বাইরে (Outside Dhaka)' : 'Outside Dhaka'}
                  </span>
                  <span className="heading-6 font-bold text-ink">৳130 BDT</span>
                  <p className="caption-3 text-muted">
                    {language === 'bn' ? 'সারাদেশে ২ থেকে ৪ কার্যদিবসের মধ্যে নির্ভরযোগ্য ডেলিভারি' : 'Estimated 2 to 4 business days across all districts'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 body-4 text-slate-700 leading-relaxed border-t border-border pt-5">
                <p>{p.deliveryInsideDhaka}</p>
                <p>{p.deliveryOutsideDhaka}</p>
                <p className="p-3.5 rounded-lg bg-surface-muted text-slate-600 text-xs sm:text-sm">
                  {p.deliveryCourierNote}
                </p>
              </div>
            </section>
          )}

          {/* 7-Day Replacement Warranty */}
          {(activeTab === 'all' || activeTab === 'returns') && (
            <section
              id="return"
              className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-card scroll-mt-24 transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-11 w-11 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                  <FontAwesomeIcon icon={Icons.returns} className="h-5 w-5" />
                </div>
                <div>
                  <span className="caption-3 text-quantum font-semibold uppercase tracking-wider block">
                    {language === 'bn' ? 'ওয়ারেন্টি ও পরিবর্তন সুবিধা' : 'Warranty & Replacements'}
                  </span>
                  <h2 className="title-1 font-bold text-ink">{p.returnsTitle}</h2>
                </div>
              </div>

              <div className="space-y-4 body-4 text-slate-700 leading-relaxed">
                <p>{p.returnsCoverage}</p>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="title-4 font-semibold text-ink mb-1">
                    {language === 'bn' ? 'রিপ্লেসমেন্ট শর্তাবলী:' : 'Replacement Conditions:'}
                  </h4>
                  <p className="caption-3 text-slate-600">
                    {p.returnsConditions}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-quantum-soft/50 border border-quantum/20">
                  <h4 className="title-4 font-semibold text-quantum mb-1">
                    {language === 'bn' ? 'কীভাবে ক্লেইম করবেন:' : 'How to Claim:'}
                  </h4>
                  <p className="caption-3 text-slate-700">
                    {p.returnsProcess}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Privacy Notice (CP-06) */}
          {(activeTab === 'all' || activeTab === 'privacy') && (
            <section
              id="privacy"
              className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-card scroll-mt-24 transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-11 w-11 rounded-xl bg-quantum-soft text-quantum flex items-center justify-center flex-shrink-0">
                  <FontAwesomeIcon icon={Icons.shield} className="h-5 w-5" />
                </div>
                <div>
                  <span className="caption-3 text-quantum font-semibold uppercase tracking-wider block">
                    {language === 'bn' ? 'গ্রাহকের ডেটা নিরাপত্তা (SRS CP-06)' : 'Data Protection (SRS CP-06)'}
                  </span>
                  <h2 className="title-1 font-bold text-ink">{p.privacyTitle}</h2>
                </div>
              </div>

              <div className="space-y-4 body-4 text-slate-700 leading-relaxed">
                <p>{p.privacyScope}</p>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                  <FontAwesomeIcon icon={Icons.circleCheck} className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm">
                    {p.privacySecurity}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Bottom Help Callout */}
        <div className="mt-12 p-6 rounded-2xl bg-surface border border-border text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="title-2 font-bold text-ink">
              {language === 'bn' ? 'কোনো জিজ্ঞাসা আছে?' : 'Have any further questions?'}
            </h3>
            <p className="caption-3 text-muted mt-0.5">
              {language === 'bn'
                ? 'আমাদের সাপোর্ট টিম যেকোনো তথ্যের জন্য সর্বদা প্রস্তুত।'
                : 'Our support team is ready to assist you everyday from 10:00 AM to 10:00 PM.'}
            </p>
          </div>
          <Link
            to="/contact"
            className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md whitespace-nowrap shadow-sm"
          >
            <FontAwesomeIcon icon={Icons.email} className="mr-2 h-4 w-4" />
            <span>{t.nav.contact}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
