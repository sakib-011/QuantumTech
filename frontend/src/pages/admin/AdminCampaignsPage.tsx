import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Campaign, CampaignStatus } from '../../types';
import { promotionService } from '../../services/promotionService';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../../utilities/icons';
import { ImageUploadInput } from '../../components/ImageUploadInput';

const BANNER_POSITIONS: { label: string; value: Campaign['bannerPosition'] }[] = [
  { label: 'Featured Festival Section (Homepage)', value: 'featured' },
  { label: 'Hero Banner', value: 'hero' },
  { label: 'Middle Promo Banner', value: 'middle' },
  { label: 'None (Standalone Campaign Page Only)', value: 'none' },
];

export const AdminCampaignsPage: React.FC = () => {
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [slug, setSlug] = useState('');
  const [occasion, setOccasion] = useState('Eid-ul-Fitr');
  const [description, setDescription] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [campaignImage, setCampaignImage] = useState('');
  const [desktopBanner, setDesktopBanner] = useState('');
  const [mobileBanner, setMobileBanner] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<number>(10);
  const [bannerPosition, setBannerPosition] = useState<Campaign['bannerPosition']>('featured');
  const [badgeText, setBadgeText] = useState('EID SPECIAL');
  const [customCtaText, setCustomCtaText] = useState('Shop Eid Offers');
  const [customCtaLink, setCustomCtaLink] = useState('');
  const [showCountdown, setShowCountdown] = useState(true);

  const loadData = () => {
    setCampaigns(promotionService.getCampaigns());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('quantum_campaigns_updated', handleSync);
    return () => window.removeEventListener('quantum_campaigns_updated', handleSync);
  }, []);

  const openAddModal = () => {
    setEditingCampaign(null);
    const now = new Date();
    const nextWeek = new Date(Date.now() + 14 * 86400000);
    setName('');
    setNameBn('');
    setSlug('');
    setOccasion('Eid-ul-Fitr');
    setDescription('');
    setDescriptionBn('');
    setCampaignImage('https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80');
    setDesktopBanner('https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1600&q=80');
    setMobileBanner('https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80');
    setStartDate(now.toISOString().slice(0, 16));
    setEndDate(nextWeek.toISOString().slice(0, 16));
    setPriority(10);
    setBannerPosition('featured');
    setBadgeText('EID SPECIAL');
    setCustomCtaText('Shop Offers');
    setCustomCtaLink('');
    setShowCountdown(true);
    setIsModalOpen(true);
  };

  const openEditModal = (camp: Campaign) => {
    setEditingCampaign(camp);
    setName(camp.name);
    setNameBn(camp.nameBn || '');
    setSlug(camp.landingPageSlug || camp.id);
    setOccasion(camp.occasion);
    setDescription(camp.description);
    setDescriptionBn(camp.descriptionBn || '');
    setCampaignImage(camp.campaignImage);
    setDesktopBanner(camp.desktopBanner || '');
    setMobileBanner(camp.mobileBanner || '');
    setStartDate(camp.startDate.slice(0, 16));
    setEndDate(camp.endDate.slice(0, 16));
    setPriority(camp.priority);
    setBannerPosition(camp.bannerPosition);
    setBadgeText(camp.badgeText || '');
    setCustomCtaText(camp.customCtaText || 'Explore Deals');
    setCustomCtaLink(camp.customCtaLink || '');
    setShowCountdown(camp.showCountdown ?? true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      showToast('Please fill in required fields.', 'error');
      return;
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      nameBn: nameBn.trim() || undefined,
      occasion: occasion.trim(),
      description: description.trim(),
      descriptionBn: descriptionBn.trim() || undefined,
      campaignImage: campaignImage.trim() || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80',
      desktopBanner: desktopBanner.trim() || undefined,
      mobileBanner: mobileBanner.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      status: 'Active',
      priority: Number(priority) || 1,
      bannerPosition,
      badgeText: badgeText.trim() || undefined,
      customCtaText: customCtaText.trim() || undefined,
      customCtaLink: customCtaLink.trim() || `/campaign/${cleanSlug}`,
      landingPageSlug: cleanSlug,
      showCountdown,
    };

    try {
      if (editingCampaign) {
        await promotionService.updateCampaign(editingCampaign.id, campaignData);
        showToast('Campaign updated successfully!', 'success');
      } else {
        await promotionService.createCampaign(campaignData);
        showToast('Campaign created successfully!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save campaign.', 'error');
    }
  };

  const handleDelete = async (id: string, campName: string) => {
    if (window.confirm(`Delete campaign "${campName}"?`)) {
      try {
        await promotionService.deleteCampaign(id);
        showToast('Campaign deleted.', 'info');
        loadData();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to delete campaign.', 'error');
      }
    }
  };

  const handleToggleStatus = async (camp: Campaign) => {
    const newStatus: CampaignStatus = camp.status === 'Paused' ? 'Active' : 'Paused';
    try {
      await promotionService.updateCampaign(camp.id, { status: newStatus });
      showToast(`Campaign ${newStatus.toLowerCase()}.`, 'success');
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update campaign.', 'error');
    }
  };

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.occasion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Active
          </span>
        );
      case 'Scheduled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Scheduled
          </span>
        );
      case 'Paused':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Paused
          </span>
        );
      case 'Expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Campaigns & Festival Offers</h1>
          <p className="text-sm text-muted mt-1">
            Create scheduled promotional campaigns, seasonal sales, countdown banners, and festival landing pages.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-campaign-btn"
          onClick={openAddModal}
          className="btn-base bg-quantum text-white hover:bg-quantum-hover px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={Icons.plus} className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-4 rounded-xl border border-border flex items-center justify-between gap-3 shadow-xs max-w-md">
        <div className="relative w-full">
          <FontAwesomeIcon
            icon={Icons.search}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted"
          />
          <input
            type="text"
            placeholder="Search campaigns or occasions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border focus:outline-none focus:border-quantum"
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-surface-alt border-b border-border text-muted uppercase font-semibold">
              <tr>
                <th className="p-3.5 pl-5">Campaign</th>
                <th className="p-3.5">Occasion</th>
                <th className="p-3.5">Placement</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Schedule</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="font-semibold text-ink text-sm">{camp.name}</div>
                      {camp.landingPageSlug && (
                        <div className="text-muted font-mono text-[11px] mt-0.5">
                          /campaign/{camp.landingPageSlug}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-surface-alt border border-border text-[11px] font-medium text-ink">
                        {camp.occasion}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-muted capitalize">{camp.bannerPosition}</span>
                    </td>
                    <td className="p-3.5 font-medium">{camp.priority}</td>
                    <td className="p-3.5 text-muted leading-tight">
                      <div>From: {new Date(camp.startDate).toLocaleDateString()}</div>
                      <div>To: {new Date(camp.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="p-3.5">{getStatusBadge(camp.status)}</td>
                    <td className="p-3.5 pr-5 text-right space-x-1 whitespace-nowrap">
                      {camp.landingPageSlug && (
                        <a
                          href={`/campaign/${camp.landingPageSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-muted hover:text-quantum hover:bg-quantum-soft/50 inline-flex items-center"
                          title="View Public Landing Page"
                        >
                          <FontAwesomeIcon icon={Icons.store} className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(camp)}
                        className={`p-1.5 rounded-lg inline-flex items-center ${
                          camp.status === 'Paused'
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-amber-600 hover:bg-amber-50'
                        }`}
                        title={camp.status === 'Paused' ? 'Resume Campaign' : 'Pause Campaign'}
                      >
                        <FontAwesomeIcon
                          icon={camp.status === 'Paused' ? Icons.check : Icons.close}
                          className="h-3.5 w-3.5"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(camp)}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-alt inline-flex items-center"
                        title="Edit Campaign"
                      >
                        <FontAwesomeIcon icon={Icons.edit} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(camp.id, camp.name)}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error-soft/30 inline-flex items-center"
                        title="Delete Campaign"
                      >
                        <FontAwesomeIcon icon={Icons.trash} className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Modal (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col my-8">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {editingCampaign ? 'Edit Campaign' : 'Create New Promotional Campaign'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg text-muted hover:text-ink flex items-center justify-center hover:bg-surface-alt"
              >
                <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Campaign Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingCampaign) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    placeholder="e.g. Eid Mega Festival Sale"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Campaign Name (Bangla)</label>
                  <input
                    type="text"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    placeholder="e.g. ঈদ মেগা ফেস্টিভ্যাল অফার"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Occasion / Event *</label>
                  <input
                    type="text"
                    required
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="e.g. Eid-ul-Fitr, Black Friday"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Landing Page Slug URL</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="eid-mega-festival"
                    className="w-full rounded-xl border border-border px-3 py-2 font-mono text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Homepage Placement</label>
                  <select
                    value={bannerPosition}
                    onChange={(e) => setBannerPosition(e.target.value as Campaign['bannerPosition'])}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink bg-surface focus:border-quantum focus:outline-none"
                  >
                    {BANNER_POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">Description / Tagline *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Celebrate this Eid with authentic gadget discounts..."
                  className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-ink block mb-1">Priority (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="e.g. EID SPECIAL"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Button CTA Text</label>
                  <input
                    type="text"
                    value={customCtaText}
                    onChange={(e) => setCustomCtaText(e.target.value)}
                    placeholder="Shop Eid Offers"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>
              </div>

              <ImageUploadInput
                label="Campaign Primary Image"
                required
                value={campaignImage}
                onChange={setCampaignImage}
                placeholder="https://images.unsplash.com/photo-..."
                helperText="Upload or drag campaign banner photo (auto-compressed)"
                aspectRatio="banner"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadInput
                  label="Desktop Banner Image (Optional)"
                  value={desktopBanner}
                  onChange={setDesktopBanner}
                  placeholder="https://images.unsplash.com/photo-..."
                  helperText="Wide aspect banner for desktop screens"
                  aspectRatio="banner"
                />
                <ImageUploadInput
                  label="Mobile Banner Image (Optional)"
                  value={mobileBanner}
                  onChange={setMobileBanner}
                  placeholder="https://images.unsplash.com/photo-..."
                  helperText="Compact banner optimized for mobile view"
                  aspectRatio="video"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="countdown-toggle"
                  checked={showCountdown}
                  onChange={(e) => setShowCountdown(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-quantum focus:ring-quantum"
                />
                <label htmlFor="countdown-toggle" className="font-semibold text-ink cursor-pointer">
                  Display Real-time Countdown Timer on Homepage & Landing Page
                </label>
              </div>

              <div className="p-4 bg-surface-alt rounded-xl border border-border flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-surface text-ink hover:bg-surface-alt font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-quantum text-white hover:bg-quantum-hover font-semibold shadow-sm"
                >
                  {editingCampaign ? 'Update Campaign' : 'Publish Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
