import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { settingsService } from '../../services/settingsService';
import { StoreSettings } from '../../types';
import { setItem, STORAGE_KEYS } from '../../utilities/storage';
import { updateAdminProfile } from '../../services/backend';
import { useToast } from '../../context/ToastContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Icons } from '../../utilities/icons';
import { ImageUploadInput } from '../../components/ImageUploadInput';
import heroBannerImg from '../../assets/brand/hero-banner.png';

export const AdminSettingsPage: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const { language, t } = useLanguage();
  const { isDark, setTheme } = useTheme();
  const [settings, setSettings] = useState<StoreSettings>(() => settingsService.getSettings());

  // Admin Profile Fields
  const [adminName, setAdminName] = useState(adminUser?.name || 'Irfan Khan Shahil');
  const [adminEmail, setAdminEmail] = useState(adminUser?.email || 'admin@quantumtech.com');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'store' | 'hero' | 'payment' | 'social' | 'profile'>('store');

  const { showToast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (settings.deliveryChargeInsideDhaka < 0 || settings.deliveryChargeOutsideDhaka < 0) {
      showToast('Delivery charges cannot be negative numbers.', 'error');
      return;
    }

    if (!settings.bKashNumber || !settings.nagadNumber) {
      showToast('bKash and Nagad account numbers are required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (activeTab === 'profile') {
        if (!adminUser) throw new Error('Administrator session is unavailable. Please sign in again.');
        const updated = await updateAdminProfile({ name: adminName.trim(), email: adminEmail.trim() });
        setItem(STORAGE_KEYS.ADMIN_SESSION, {
          ...adminUser,
          name: updated.name,
          email: updated.email,
        });
        window.dispatchEvent(new Event('quantum_auth_updated'));
      } else {
        await settingsService.saveSettings(settings);
      }

      showToast(t.admin.settings.saveSuccess, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save store settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl flex flex-col gap-6">
      {/* Top Header */}
      <div>
        <span className="caption-4 font-semibold text-quantum uppercase tracking-wider block mb-1">
          Store Configuration &amp; Channels
        </span>
        <h1 className="heading-4 sm:heading-3 font-bold text-ink">Store Settings</h1>
        <p className="caption-2 text-muted mt-0.5">
          Configure business details, mobile payment numbers, shipping rates, and social profiles
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'store'
              ? 'bg-quantum text-white shadow-xs'
              : 'bg-surface hover:bg-surface-alt text-slate-700 border border-border'
          }`}
        >
          <FontAwesomeIcon icon={Icons.store} className="mr-2 h-3.5 w-3.5" />
          <span>{language === 'bn' ? 'স্টোর তথ্য ও যোগাযোগ' : 'Store Information & Contact'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'hero'
              ? 'bg-quantum text-white shadow-xs'
              : 'bg-surface hover:bg-surface-alt text-slate-700 border border-border'
          }`}
        >
          <FontAwesomeIcon icon={Icons.image} className="mr-2 h-3.5 w-3.5" />
          <span>{language === 'bn' ? 'হিরো সেকশন ও ব্যানার' : 'Hero Section & Banner'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payment')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'payment'
              ? 'bg-quantum text-white shadow-xs'
              : 'bg-surface hover:bg-surface-alt text-slate-700 border border-border'
          }`}
        >
          <FontAwesomeIcon icon={Icons.money} className="mr-2 h-3.5 w-3.5" />
          <span>{language === 'bn' ? 'পেমেন্ট নম্বর ও ডেলিভারি' : 'Payment Numbers & Delivery'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'social'
              ? 'bg-quantum text-white shadow-xs'
              : 'bg-surface hover:bg-surface-alt text-slate-700 border border-border'
          }`}
        >
          <FontAwesomeIcon icon={Icons.share} className="mr-2 h-3.5 w-3.5" />
          <span>{language === 'bn' ? 'সামাজিক মাধ্যম লিংক' : 'Social Media Links'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-quantum text-white shadow-xs'
              : 'bg-surface hover:bg-surface-alt text-slate-700 border border-border'
          }`}
        >
          <FontAwesomeIcon icon={Icons.user} className="mr-2 h-3.5 w-3.5" />
          <span>{language === 'bn' ? 'অ্যাডমিন প্রোফাইল' : 'Admin Profile'}</span>
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Tab 1: Store Information & Contact Details */}
        {activeTab === 'store' && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-5 animate-fadeIn">
            <div>
              <h2 className="title-2 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.store} className="h-4 w-4 text-quantum" />
                <span>Store Information &amp; Brand Story</span>
              </h2>
              <p className="caption-3 text-muted">Customer-facing business branding shown in header, footer and about pages</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">Store Name *</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  required
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>

              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">Brand Slogan</label>
                <input
                  type="text"
                  value={settings.slogan || "We Find The Tech So You Don't Have To."}
                  onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="caption-3 font-semibold text-ink block mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>
            </div>

            <hr className="border-border my-1" />

            <div>
              <h3 className="title-3 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.phone} className="h-3.5 w-3.5 text-quantum" />
                <span>Contact Details &amp; Operating Hours</span>
              </h3>
              <p className="caption-4 text-muted mb-4">Official phone, email, and location shown to customers</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Customer Hotline Phone *</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-mono"
                  />
                </div>

                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Customer Support Email *</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>

                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Operating Business Hours *</label>
                  <input
                    type="text"
                    value={settings.businessHours}
                    onChange={(e) => setSettings({ ...settings, businessHours: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>

                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Store / Office Address *</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
              </div>
            </div>

            <hr className="border-border my-1" />

            {/* Appearance & Color Mode */}
            <div>
              <h3 className="title-3 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={isDark ? Icons.moon : Icons.sun} className="h-3.5 w-3.5 text-quantum" />
                <span>{language === 'bn' ? 'স্টোর ও অ্যাডমিন থিম মুড' : 'Storefront & Admin Theme Mode'}</span>
              </h3>
              <p className="caption-4 text-muted mb-4">
                {language === 'bn'
                  ? 'গ্রাহক ওয়েবসাইট ও অ্যাডমিন প্যানেলের জন্য লাইট অথবা ডার্ক মুড নির্বাচন করুন।'
                  : 'Choose between Light Mode or Dark Mode across storefront and admin panel.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    !isDark
                      ? 'border-quantum bg-quantum/5 ring-2 ring-quantum/20'
                      : 'border-border bg-surface hover:bg-surface-muted'
                  }`}
                >
                  <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-amber-500 shadow-2xs flex-shrink-0">
                    <FontAwesomeIcon icon={Icons.sun} className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="caption-2 font-bold text-ink block">Light Mode</span>
                    <span className="caption-5 text-muted block mt-0.5">
                      Clean modern daylight design, high contrast readable interface.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    isDark
                      ? 'border-quantum bg-quantum/10 ring-2 ring-quantum/30'
                      : 'border-border bg-surface hover:bg-surface-muted'
                  }`}
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-quantum shadow-2xs flex-shrink-0">
                    <FontAwesomeIcon icon={Icons.moon} className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="caption-2 font-bold text-ink block">Dark Mode</span>
                    <span className="caption-5 text-muted block mt-0.5">
                      Sleek cyber charcoal palette strictly matching landing-page-design tokens.
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Storefront Hero Section & Banner Customization */}
        {activeTab === 'hero' && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-6 animate-fadeIn">
            {/* Header */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="title-2 font-bold text-ink mb-1 flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.image} className="h-4 w-4 text-quantum" />
                  <span>{language === 'bn' ? 'হিরো সেকশন ও স্টোরফ্রন্ট ব্যানার' : 'Hero Section & Storefront Banner'}</span>
                </h2>
                <span className="caption-3 px-2.5 py-0.5 rounded-full bg-quantum/10 text-quantum font-semibold w-fit">
                  {language === 'bn' ? 'স্টোরফ্রন্ট হোমপেজ' : 'Storefront Landing Page'}
                </span>
              </div>
              <p className="caption-3 text-muted">
                {language === 'bn'
                  ? 'গ্রাহক হোমপেজের মূল হিরো ব্যানার ছবি, হেডলাইন টেক্সট, সাবটাইটেল এবং বাটন সহজে পরিবর্তন করুন।'
                  : 'Customize the primary hero banner image, headline texts, badge, call-to-action buttons, and social proof on the storefront landing page.'}
              </p>
            </div>

            {/* Banner Image Upload & Controls */}
            <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-alt/40 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="title-3 font-bold text-ink flex items-center gap-2">
                    <FontAwesomeIcon icon={Icons.camera} className="h-3.5 w-3.5 text-quantum" />
                    <span>{language === 'bn' ? 'হিরো ব্যানার ছবি (Hero Banner Image)' : 'Hero Banner Image'}</span>
                  </h3>
                  <p className="caption-4 text-muted">
                    {language === 'bn'
                      ? 'নতুন ব্যানার আপলোড করুন বা লিংক দিন। খালি রাখলে ডিফল্ট ব্যানার দেখাবে।'
                      : 'Upload an image file (JPG, PNG, WEBP) or paste an image URL. Leave empty to use the default brand visual.'}
                  </p>
                </div>
                {settings.heroBannerImage && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, heroBannerImage: '' })}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-muted text-rose-500 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                  >
                    <FontAwesomeIcon icon={Icons.refresh} className="h-3 w-3" />
                    <span>{language === 'bn' ? 'ডিফল্ট ব্যানারে ফিরুন' : 'Reset to Default Banner'}</span>
                  </button>
                )}
              </div>

              <ImageUploadInput
                value={settings.heroBannerImage || ''}
                onChange={(url) => setSettings({ ...settings, heroBannerImage: url })}
                label={language === 'bn' ? 'ব্যানার ছবি আপলোড (Hero Banner)' : 'Hero Banner Image Upload'}
                placeholder="https://images.unsplash.com/... or upload local image"
                helperText={language === 'bn' ? 'ব্যানার ফাইল ড্রপ করুন বা আপলোড করুন (স্বয়ংক্রিয়ভাবে কম্প্রেস হবে)' : 'Select or drag & drop banner (auto-compressed for ultra fast web loading)'}
                aspectRatio="video"
                maxWidth={1600}
                maxHeight={1200}
              />

              {/* Banner Overlay Floating Texts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    {language === 'bn' ? 'ব্যানার ওভারলে ব্যাজ (English)' : 'Banner Overlay Badge (English)'}
                  </label>
                  <input
                    type="text"
                    value={settings.heroBannerBadge || ''}
                    onChange={(e) => setSettings({ ...settings, heroBannerBadge: e.target.value })}
                    placeholder="100% Genuine Tech"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    {language === 'bn' ? 'ব্যানার ওভারলে ব্যাজ (বাংলা)' : 'Banner Overlay Badge (Bangla)'}
                  </label>
                  <input
                    type="text"
                    value={settings.heroBannerBadgeBn || ''}
                    onChange={(e) => setSettings({ ...settings, heroBannerBadgeBn: e.target.value })}
                    placeholder="১০০% জেনুইন টেক"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    {language === 'bn' ? 'ব্যানার ওভারলে ট্যাগলাইন (English)' : 'Banner Overlay Tagline (English)'}
                  </label>
                  <input
                    type="text"
                    value={settings.heroBannerTagline || ''}
                    onChange={(e) => setSettings({ ...settings, heroBannerTagline: e.target.value })}
                    placeholder="We find the tech so you do not have to."
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    {language === 'bn' ? 'ব্যানার ওভারলে ট্যাগলাইন (বাংলা)' : 'Banner Overlay Tagline (Bangla)'}
                  </label>
                  <input
                    type="text"
                    value={settings.heroBannerTaglineBn || ''}
                    onChange={(e) => setSettings({ ...settings, heroBannerTaglineBn: e.target.value })}
                    placeholder="আপনার জন্য সেরা গ্যাজেট আমরাই বাছাই করি।"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
              </div>
            </div>

            {/* Headline & Subtitle Section */}
            <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-alt/40 flex flex-col gap-4">
              <div>
                <h3 className="title-3 font-bold text-ink flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.tag} className="h-3.5 w-3.5 text-quantum" />
                  <span>{language === 'bn' ? 'হিরো হেডলাইন ও বর্ণনা' : 'Hero Badge, Headings & Subtitle'}</span>
                </h3>
                <p className="caption-4 text-muted">
                  {language === 'bn'
                    ? 'ইংরেজি ও বাংলা উভয় ভাষার জন্য হিরো টেক্সট কাস্টমাইজ করুন।'
                    : 'Configure bilingual headline typography for both English and Bangla visitors.'}
                </p>
              </div>

              {/* Top Pill Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Top Pill Badge (English)
                  </label>
                  <input
                    type="text"
                    value={settings.heroBadgeText || ''}
                    onChange={(e) => setSettings({ ...settings, heroBadgeText: e.target.value })}
                    placeholder="NEW ARRIVALS 2026"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Top Pill Badge (Bangla)
                  </label>
                  <input
                    type="text"
                    value={settings.heroBadgeTextBn || ''}
                    onChange={(e) => setSettings({ ...settings, heroBadgeTextBn: e.target.value })}
                    placeholder="নতুন কালেকশন ২০২৬"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
              </div>

              {/* Title Line 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Main Heading Line 1 (English)
                  </label>
                  <input
                    type="text"
                    value={settings.heroTitleLine1 || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitleLine1: e.target.value })}
                    placeholder="Gear up."
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Main Heading Line 1 (Bangla)
                  </label>
                  <input
                    type="text"
                    value={settings.heroTitleLine1Bn || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitleLine1Bn: e.target.value })}
                    placeholder="সেরা গ্যাজেট।"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
              </div>

              {/* Title Line 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Main Heading Line 2 (English, Highlighted)
                  </label>
                  <input
                    type="text"
                    value={settings.heroTitleLine2 || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitleLine2: e.target.value })}
                    placeholder="Charge fast."
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Main Heading Line 2 (Bangla, Highlighted)
                  </label>
                  <input
                    type="text"
                    value={settings.heroTitleLine2Bn || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitleLine2Bn: e.target.value })}
                    placeholder="দ্রুত চার্জিং।"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Hero Subtitle Description (English)
                  </label>
                  <textarea
                    rows={2}
                    value={settings.heroSubtitle || ''}
                    onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                    placeholder="Quality verified tech accessories at honest prices. Cash on Delivery and fast nationwide delivery."
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">
                    Hero Subtitle Description (Bangla)
                  </label>
                  <textarea
                    rows={2}
                    value={settings.heroSubtitleBn || ''}
                    onChange={(e) => setSettings({ ...settings, heroSubtitleBn: e.target.value })}
                    placeholder="ন্যায্য মূল্যে কোয়ালিটি ভেরিফাইড টেক এক্সেসরিজ। ক্যাশ অন ডেলিভারি এবং দ্রুত সারাদেশে ডেলিভারি।"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
              </div>
            </div>

            {/* Call-to-Action Buttons */}
            <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-alt/40 flex flex-col gap-4">
              <div>
                <h3 className="title-3 font-bold text-ink flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.cart} className="h-3.5 w-3.5 text-quantum" />
                  <span>{language === 'bn' ? 'কল-টু-অ্যাকশন বাটন' : 'Hero Action Buttons (CTAs)'}</span>
                </h3>
                <p className="caption-4 text-muted">
                  {language === 'bn' ? 'বাটনের টেক্সট এবং গন্তব্য লিংক নির্ধারণ করুন।' : 'Configure button labels and destination page URLs.'}
                </p>
              </div>

              {/* Primary CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Primary Button Text (EN)</label>
                  <input
                    type="text"
                    value={settings.heroPrimaryCtaText || ''}
                    onChange={(e) => setSettings({ ...settings, heroPrimaryCtaText: e.target.value })}
                    placeholder="Shop Now"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Primary Button Text (BN)</label>
                  <input
                    type="text"
                    value={settings.heroPrimaryCtaTextBn || ''}
                    onChange={(e) => setSettings({ ...settings, heroPrimaryCtaTextBn: e.target.value })}
                    placeholder="শপ করুন"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Primary Button Route Link</label>
                  <input
                    type="text"
                    value={settings.heroPrimaryCtaLink || ''}
                    onChange={(e) => setSettings({ ...settings, heroPrimaryCtaLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-mono"
                  />
                </div>
              </div>

              {/* Secondary CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Secondary Button Text (EN)</label>
                  <input
                    type="text"
                    value={settings.heroSecondaryCtaText || ''}
                    onChange={(e) => setSettings({ ...settings, heroSecondaryCtaText: e.target.value })}
                    placeholder="Browse Categories"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Secondary Button Text (BN)</label>
                  <input
                    type="text"
                    value={settings.heroSecondaryCtaTextBn || ''}
                    onChange={(e) => setSettings({ ...settings, heroSecondaryCtaTextBn: e.target.value })}
                    placeholder="ক্যাটাগরি দেখুন"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Secondary Button Route Link</label>
                  <input
                    type="text"
                    value={settings.heroSecondaryCtaLink || ''}
                    onChange={(e) => setSettings({ ...settings, heroSecondaryCtaLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Social Proof & Rating Line */}
            <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-alt/40 flex flex-col gap-4">
              <div>
                <h3 className="title-3 font-bold text-ink flex items-center gap-2">
                  <FontAwesomeIcon icon={Icons.star} className="h-3.5 w-3.5 text-amber-500" />
                  <span>{language === 'bn' ? 'সোশ্যাল প্রুফ ও রেটিং বার' : 'Social Proof & Rating Strip'}</span>
                </h3>
                <p className="caption-4 text-muted">
                  {language === 'bn' ? 'হিরো সেকশনের নিচে ট্রাস্ট রেটিং ও ক্রেতার সংখ্যা প্রদর্শন করুন।' : 'Trust indicators and customer review metrics displayed below CTA buttons.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Rating Score</label>
                  <input
                    type="text"
                    value={settings.heroRatingScore || ''}
                    onChange={(e) => setSettings({ ...settings, heroRatingScore: e.target.value })}
                    placeholder="4.8 / 5 Rating"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Rating Subtext (EN)</label>
                  <input
                    type="text"
                    value={settings.heroRatingText || ''}
                    onChange={(e) => setSettings({ ...settings, heroRatingText: e.target.value })}
                    placeholder="from 2,500+ buyers across Bangladesh"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Rating Subtext (BN)</label>
                  <input
                    type="text"
                    value={settings.heroRatingTextBn || ''}
                    onChange={(e) => setSettings({ ...settings, heroRatingTextBn: e.target.value })}
                    placeholder="সারাদেশে ২,৫০০+ সন্তুষ্ট ক্রেতা"
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Live Preview */}
            <div className="p-4 sm:p-5 rounded-xl border border-quantum/30 bg-quantum/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="caption-3 font-bold text-quantum uppercase tracking-wider flex items-center gap-1.5">
                  <FontAwesomeIcon icon={Icons.eye} className="h-3.5 w-3.5" />
                  <span>Live Storefront Preview</span>
                </span>
                <span className="caption-4 text-muted">Visualizing current hero configuration</span>
              </div>
              <div className="bg-surface rounded-xl border border-border p-4 sm:p-6 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-7 flex flex-col items-start">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-quantum-soft text-quantum caption-4 font-semibold mb-2">
                      <FontAwesomeIcon icon={Icons.lightning} className="h-2.5 w-2.5" />
                      <span>{settings.heroBadgeText || 'NEW ARRIVALS 2026'}</span>
                    </div>
                    <h3 className="title-1 font-bold text-ink mb-2 leading-tight">
                      <span className="hero-gradient-text-light block">{settings.heroTitleLine1 || 'Gear up.'}</span>
                      <span className="text-quantum block">{settings.heroTitleLine2 || 'Charge fast.'}</span>
                    </h3>
                    <p className="caption-2 text-muted mb-4 max-w-md">
                      {settings.heroSubtitle || 'Quality verified tech accessories at honest prices.'}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-4 py-2 rounded-lg bg-quantum text-white text-xs font-semibold flex items-center gap-1.5">
                        <FontAwesomeIcon icon={Icons.cart} className="h-3 w-3" />
                        <span>{settings.heroPrimaryCtaText || 'Shop Now'}</span>
                      </div>
                      <div className="px-3 py-2 rounded-lg border border-border bg-surface text-ink text-xs font-semibold flex items-center gap-1.5">
                        <FontAwesomeIcon icon={Icons.category} className="h-3 w-3 text-muted" />
                        <span>{settings.heroSecondaryCtaText || 'Browse Categories'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-border w-full">
                      <div className="flex text-amber-400 text-2xs">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <FontAwesomeIcon key={i} icon={Icons.star} className="h-2.5 w-2.5" />
                        ))}
                      </div>
                      <span className="caption-4 text-muted">
                        <strong className="text-ink font-semibold">{settings.heroRatingScore || '4.8 / 5 Rating'}</strong>{' '}
                        {settings.heroRatingText || 'from 2,500+ buyers across Bangladesh'}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <div className="relative rounded-xl overflow-hidden border border-border bg-slate-900 dark:bg-[#181818] shadow-sm aspect-video">
                      <img
                        src={settings.heroBannerImage || heroBannerImg}
                        alt="Hero Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent dark:from-[#121212]/95 dark:via-[#121212]/40 flex flex-col justify-end p-3">
                        <span className="caption-5 px-1.5 py-0.5 rounded bg-quantum text-white inline-block w-fit mb-0.5 font-semibold">
                          {settings.heroBannerBadge || '100% Genuine Tech'}
                        </span>
                        <p className="caption-2 text-white font-semibold">
                          {settings.heroBannerTagline || 'We find the tech so you do not have to.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Configurable Payment Numbers & Delivery Charges */}
        {activeTab === 'payment' && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-6 animate-fadeIn">
            {/* Payment Numbers */}
            <div>
              <h2 className="title-2 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.money} className="h-4 w-4 text-quantum" />
                <span>Configurable Mobile Payment Numbers</span>
              </h2>
              <p className="caption-4 text-muted mb-4">
                These numbers and instructions appear during customer guest checkout for bKash and Nagad payments.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">bKash Account Number *</label>
                  <input
                    type="text"
                    value={settings.bKashNumber}
                    onChange={(e) => setSettings({ ...settings, bKashNumber: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-mono"
                  />
                  <span className="caption-5 text-muted mt-1 block">Account type: Personal (Send Money)</span>
                </div>

                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Nagad Account Number *</label>
                  <input
                    type="text"
                    value={settings.nagadNumber}
                    onChange={(e) => setSettings({ ...settings, nagadNumber: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-mono"
                  />
                  <span className="caption-5 text-muted mt-1 block">Account type: Personal (Send Money)</span>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* Delivery Charges */}
            <div>
              <h2 className="title-2 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.delivery} className="h-4 w-4 text-quantum" />
                <span>Delivery Charges (BDT)</span>
              </h2>
              <p className="caption-4 text-muted mb-4">
                Configurable sample delivery tariffs automatically applied at customer checkout.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Inside Dhaka Delivery Charge (BDT) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={settings.deliveryChargeInsideDhaka}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          deliveryChargeInsideDhaka: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      required
                      className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-bold pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted font-bold">৳</span>
                  </div>
                  <span className="caption-5 text-muted mt-1 block">Standard turnaround: 24 to 48 hours</span>
                </div>

                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Outside Dhaka Delivery Charge (BDT) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={settings.deliveryChargeOutsideDhaka}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          deliveryChargeOutsideDhaka: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      required
                      className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-bold pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted font-bold">৳</span>
                  </div>
                  <span className="caption-5 text-muted mt-1 block">Nationwide turnaround: 2 to 4 business days</span>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* Thresholds & Alerts */}
            <div>
              <h3 className="title-3 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.warning} className="h-3.5 w-3.5 text-quantum" />
                <span>Inventory Thresholds &amp; Owner Alerts</span>
              </h3>
              <p className="caption-4 text-muted mb-4">
                Immediate order notification recipient email and inventory safety thresholds.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Owner Alert Email (FR-28) *</label>
                  <input
                    type="email"
                    value={settings.ownerNotificationEmail}
                    onChange={(e) => setSettings({ ...settings, ownerNotificationEmail: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                </div>

                <div>
                  <label className="caption-3 font-semibold text-ink block mb-1">Low-Stock Warning Threshold (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.lowStockThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lowStockThreshold: parseInt(e.target.value, 10) || 5,
                      })
                    }
                    required
                    className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                  />
                  <span className="caption-5 text-muted mt-1 block">Default: 5 units or fewer triggers low stock alert</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Social Media Links */}
        {activeTab === 'social' && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-5 animate-fadeIn">
            <div>
              <h2 className="title-2 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.share} className="h-4 w-4 text-quantum" />
                <span>Social Media &amp; Chat Channels</span>
              </h2>
              <p className="caption-3 text-muted">Links rendered in storefront header, footer, contact, and product inquiry buttons</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={Icons.facebook} className="h-3.5 w-3.5 text-blue-600" />
                  <span>Facebook Page URL</span>
                </label>
                <input
                  type="url"
                  value={settings.facebookUrl}
                  onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>

              <div>
                <label className="caption-3 font-semibold text-ink block mb-1 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={Icons.instagram} className="h-3.5 w-3.5 text-pink-600" />
                  <span>Instagram Profile URL</span>
                </label>
                <input
                  type="url"
                  value={settings.instagramUrl}
                  onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>

              <div>
                <label className="caption-3 font-semibold text-ink block mb-1 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={Icons.whatsapp} className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp Contact Phone Number</span>
                </label>
                <input
                  type="text"
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="+880 1712-345678"
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum font-mono"
                />
              </div>

              <div>
                <label className="caption-3 font-semibold text-ink block mb-1 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={Icons.messenger} className="h-3.5 w-3.5 text-blue-500" />
                  <span>Facebook Messenger Link</span>
                </label>
                <input
                  type="url"
                  value={settings.messengerUrl}
                  onChange={(e) => setSettings({ ...settings, messengerUrl: e.target.value })}
                  placeholder="https://m.me/..."
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Admin Profile Settings */}
        {activeTab === 'profile' && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-5 animate-fadeIn">
            <div>
              <h2 className="title-2 font-bold text-ink mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={Icons.user} className="h-4 w-4 text-quantum" />
                <span>Store Owner Administrator Profile</span>
              </h2>
              <p className="caption-3 text-muted">Update administrator credentials and session details</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">Administrator Full Name *</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>

              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">Administrator Email *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-quantum"
                />
              </div>

              <div>
                <label className="caption-3 font-semibold text-ink block mb-1">Role / Authority</label>
                <input
                  type="text"
                  disabled
                  value="Store Owner (Full Administrative Access)"
                  className="w-full rounded-xl border border-border p-2.5 text-xs text-slate-500 bg-slate-100 cursor-not-allowed"
                />
              </div>

            </div>
          </div>
        )}

        {/* Save Changes Floating Action Bar */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <span className="caption-3 text-muted">
            {activeTab === 'profile'
              ? 'Administrator profile changes are saved to the backend.'
              : 'Store settings are saved to the backend before success is confirmed.'}
          </span>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm font-semibold px-6 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={isSaving ? Icons.spinner : Icons.check} className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{activeTab === 'profile' ? 'Save Profile' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
