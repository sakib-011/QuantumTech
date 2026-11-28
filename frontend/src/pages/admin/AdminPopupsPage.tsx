import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { PromotionalPopup, PopupLayoutType, PopupTriggerType, PopupFrequencyType } from '../../types';
import { promotionService } from '../../services/promotionService';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../../utilities/icons';
import { ImageUploadInput } from '../../components/ImageUploadInput';

const LAYOUTS: { label: string; value: PopupLayoutType; description: string }[] = [
  { label: 'Image with Text & CTA', value: 'image_text', description: 'Top image, bold headline, text, button' },
  { label: 'Side by Side Split', value: 'side_by_side', description: 'Left banner, right offer content' },
  { label: 'Festival Offer Banner', value: 'festival', description: 'Vibrant celebratory banner with tag' },
  { label: 'Full Offer with Countdown', value: 'full_offer', description: 'Headline, promo tag, live countdown timer' },
  { label: 'Product Discount Showcase', value: 'product_discount', description: 'Highlights specific product with price drop' },
  { label: 'Newsletter Voucher', value: 'newsletter', description: 'Get coupon for subscribing' },
  { label: 'Image Only (Clickable)', value: 'image_only', description: 'Clean clickable image banner' },
  { label: 'Custom Styled Notice', value: 'custom', description: 'Custom text and accent colors' },
];

export const AdminPopupsPage: React.FC = () => {
  const { showToast } = useToast();
  const [popups, setPopups] = useState<PromotionalPopup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PromotionalPopup | null>(null);

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Form states
  const [internalName, setInternalName] = useState('');
  const [heading, setHeading] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [layoutType, setLayoutType] = useState<PopupLayoutType>('image_text');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('Claim Offer');
  const [buttonLink, setButtonLink] = useState('/shop');
  const [badgeText, setBadgeText] = useState('LIMITED TIME');
  const [triggerType, setTriggerType] = useState<PopupTriggerType>('delay');
  const [delaySeconds, setDelaySeconds] = useState<number>(3);
  const [scrollPercentage, setScrollPercentage] = useState<number>(30);
  const [frequency, setFrequency] = useState<PopupFrequencyType>('session');
  const [targetPages, setTargetPages] = useState('all');
  const [showOnDesktop, setShowOnDesktop] = useState(true);
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [priority, setPriority] = useState<number>(10);
  const [buttonColor, setButtonColor] = useState('#0284c7');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#0f172a');

  const loadData = () => {
    setPopups(promotionService.getPopups());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('quantum_popups_updated', handleSync);
    return () => window.removeEventListener('quantum_popups_updated', handleSync);
  }, []);

  const openAddModal = () => {
    setEditingPopup(null);
    setInternalName('Welcome Promo Popup');
    setHeading('Welcome to QuantumTech');
    setSubtitle('Enjoy 10% OFF on all authentic tech accessories!');
    setDescription('Use exclusive voucher at checkout for instant discount across Bangladesh with fast Cash on Delivery.');
    setLayoutType('image_text');
    setImageUrl('https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80');
    setButtonText('Explore Deals');
    setButtonLink('/shop');
    setBadgeText('EXCLUSIVE OFFER');
    setTriggerType('delay');
    setDelaySeconds(3);
    setScrollPercentage(30);
    setFrequency('session');
    setTargetPages('all');
    setShowOnDesktop(true);
    setShowOnMobile(true);
    setPriority(10);
    setButtonColor('#0284c7');
    setBackgroundColor('#ffffff');
    setTextColor('#0f172a');
    setIsModalOpen(true);
  };

  const openEditModal = (p: PromotionalPopup) => {
    setEditingPopup(p);
    setInternalName(p.internalName);
    setHeading(p.heading);
    setSubtitle(p.subtitle || '');
    setDescription(p.description);
    setLayoutType(p.layoutType);
    setImageUrl(p.imageUrl || '');
    setButtonText(p.buttonText || 'Claim Offer');
    setButtonLink(p.buttonLink || '/shop');
    setBadgeText(p.badgeText || '');
    setTriggerType(p.triggerType);
    setDelaySeconds(p.delaySeconds || 0);
    setScrollPercentage(p.scrollPercentage || 0);
    setFrequency(p.frequency);
    setTargetPages(p.targetPages.join(', '));
    setShowOnDesktop(p.showOnDesktop);
    setShowOnMobile(p.showOnMobile);
    setPriority(p.priority);
    setButtonColor(p.buttonColor || '#0284c7');
    setBackgroundColor(p.backgroundColor || '#ffffff');
    setTextColor(p.textColor || '#0f172a');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heading.trim()) {
      showToast('Heading title is required.', 'error');
      return;
    }

    const pages = targetPages
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const popupData: Omit<PromotionalPopup, 'id' | 'createdAt' | 'updatedAt'> = {
      internalName: internalName.trim() || heading.trim(),
      heading: heading.trim(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim(),
      layoutType,
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
      buttonText: buttonText.trim() || 'Shop Now',
      buttonLink: buttonLink.trim() || '/shop',
      badgeText: badgeText.trim() || undefined,
      backgroundColor: backgroundColor.trim(),
      textColor: textColor.trim(),
      buttonColor: buttonColor.trim(),
      imagePosition: 'left',
      textAlignment: 'left',
      triggerType,
      delaySeconds: Number(delaySeconds) || 0,
      scrollPercentage: Number(scrollPercentage) || 0,
      frequency,
      targetPages: pages.length > 0 ? pages : ['all'],
      excludedPages: ['/checkout', '/order-confirmation'],
      showOnDesktop,
      showOnMobile,
      showForNewVisitors: true,
      showForReturningVisitors: true,
      priority: Number(priority) || 1,
      isEnabled: true,
    };

    try {
      if (editingPopup) {
        await promotionService.updatePopup(editingPopup.id, popupData);
        showToast('Popup updated successfully!', 'success');
      } else {
        await promotionService.createPopup(popupData);
        showToast('Popup created successfully!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save popup.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete popup "${name}"?`)) {
      try {
        await promotionService.deletePopup(id);
        showToast('Popup deleted.', 'info');
        loadData();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to delete popup.', 'error');
      }
    }
  };

  const handleToggle = async (p: PromotionalPopup) => {
    try {
      await promotionService.updatePopup(p.id, { isEnabled: !p.isEnabled });
      showToast(`Popup ${!p.isEnabled ? 'activated' : 'deactivated'}.`, 'success');
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update popup.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Popup Advertisements & Modals</h1>
          <p className="text-sm text-muted mt-1">
            Design targeted promotional popups with smart triggers, frequency capping, and live device preview.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-popup-btn"
          onClick={openAddModal}
          className="btn-base bg-quantum text-white hover:bg-quantum-hover px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={Icons.plus} className="h-3.5 w-3.5" />
          <span>New Popup</span>
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-100 flex items-center gap-3">
        <FontAwesomeIcon icon={Icons.shield} className="h-4 w-4 text-quantum dark:text-sky-400 flex-shrink-0" />
        <div>
          <span className="font-bold">E-Commerce Protection Active:</span> Popups are automatically suppressed on
          sensitive paths (<code className="font-mono bg-blue-100/90 dark:bg-blue-900/60 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-blue-700/50 px-1.5 py-0.5 rounded font-semibold">/checkout</code> and{' '}
          <code className="font-mono bg-blue-100/90 dark:bg-blue-900/60 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-blue-700/50 px-1.5 py-0.5 rounded font-semibold">/order-confirmation</code>) to ensure seamless
          conversions. Only one popup will ever display at a time (highest priority wins).
        </div>
      </div>

      {/* Popups Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-surface-alt border-b border-border text-muted uppercase font-semibold">
              <tr>
                <th className="p-3.5 pl-5">Popup Title</th>
                <th className="p-3.5">Layout Type</th>
                <th className="p-3.5">Trigger</th>
                <th className="p-3.5">Frequency</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {popups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No popups created yet. Click "New Popup" to build one.
                  </td>
                </tr>
              ) : (
                popups.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="font-semibold text-ink text-sm">{p.heading}</div>
                      <div className="text-muted text-[11px] mt-0.5">{p.internalName}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-surface-alt border border-border text-[11px] font-medium text-ink">
                        {p.layoutType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-muted capitalize">
                      {p.triggerType} {p.triggerType === 'delay' ? `(${p.delaySeconds}s)` : ''}
                      {p.triggerType === 'scroll' ? `(${p.scrollPercentage}%)` : ''}
                    </td>
                    <td className="p-3.5 text-muted capitalize">{p.frequency.replace(/_/g, ' ')}</td>
                    <td className="p-3.5 font-medium">{p.priority}</td>
                    <td className="p-3.5">
                      {p.isEnabled ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 pr-5 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggle(p)}
                        className={`p-1.5 rounded-lg inline-flex items-center ${
                          p.isEnabled ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={p.isEnabled ? 'Disable' : 'Enable'}
                      >
                        <FontAwesomeIcon icon={p.isEnabled ? Icons.close : Icons.check} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-alt inline-flex items-center"
                        title="Edit Popup & Live Preview"
                      >
                        <FontAwesomeIcon icon={Icons.edit} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.heading)}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error-soft/30 inline-flex items-center"
                        title="Delete Popup"
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

      {/* Popup Designer Modal with Live Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-6xl shadow-2xl max-h-[92vh] flex flex-col my-4">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={Icons.popup} className="h-5 w-5 text-quantum" />
                <h2 className="text-base sm:text-lg font-bold text-ink">
                  {editingPopup ? 'Edit Popup Advertisement' : 'Design New Popup Modal'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg text-muted hover:text-ink flex items-center justify-center hover:bg-surface-alt"
              >
                <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
              </button>
            </div>

            {/* Split View: Left Controls, Right Live Preview */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Form Controls Column */}
              <form
                onSubmit={handleSave}
                className="lg:col-span-7 p-5 overflow-y-auto space-y-4 text-xs border-r border-border max-h-[75vh]"
              >
                {/* Layout Type Selection */}
                <div>
                  <label className="font-semibold text-ink block mb-1.5">Popup Layout Structure *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LAYOUTS.map((lay) => (
                      <button
                        key={lay.value}
                        type="button"
                        onClick={() => setLayoutType(lay.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          layoutType === lay.value
                            ? 'border-quantum bg-quantum-soft/30 ring-1 ring-quantum'
                            : 'border-border bg-surface hover:bg-surface-alt'
                        }`}
                      >
                        <div className="font-semibold text-ink">{lay.label}</div>
                        <div className="text-[11px] text-muted leading-tight mt-0.5">{lay.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-semibold text-ink block mb-1">Headline Heading *</label>
                    <input
                      type="text"
                      required
                      value={heading}
                      onChange={(e) => setHeading(e.target.value)}
                      placeholder="e.g. Eid Mega Sale!"
                      className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-ink block mb-1">Badge Tagline</label>
                    <input
                      type="text"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      placeholder="e.g. LIMITED TIME OFFER"
                      className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Internal Reference Name</label>
                  <input
                    type="text"
                    value={internalName}
                    onChange={(e) => setInternalName(e.target.value)}
                    placeholder="e.g. Eid Mega Offer - Storefront Popup"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Subtitle / Short Note</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Limited-time festive discounts across Bangladesh"
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Offer Description *</label>
                  <textarea
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Upgrade your charging setup before the holidays..."
                    className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                  />
                </div>

                <ImageUploadInput
                  label="Popup / Offer Banner Image"
                  value={imageUrl}
                  onChange={setImageUrl}
                  placeholder="https://images.unsplash.com/photo-..."
                  helperText="Upload or paste popup creative (auto-compressed for fast loading)"
                  aspectRatio="banner"
                />

                {/* Action CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-ink block mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="Claim Offer"
                      className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-ink block mb-1">CTA Action Link</label>
                    <input
                      type="text"
                      value={buttonLink}
                      onChange={(e) => setButtonLink(e.target.value)}
                      placeholder="/shop"
                      className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                    />
                  </div>
                </div>

                {/* Triggers and Frequency Rules */}
                <div className="p-3 bg-surface-alt rounded-xl border border-border space-y-3">
                  <span className="font-bold text-ink block uppercase tracking-wider text-[11px]">
                    Display Rules & Triggers
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-ink block mb-1">Trigger Event</label>
                      <select
                        value={triggerType}
                        onChange={(e) => setTriggerType(e.target.value as PopupTriggerType)}
                        className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                      >
                        <option value="immediate">Immediate on Page Load</option>
                        <option value="delay">Time Delay (Seconds)</option>
                        <option value="scroll">Scroll Depth (%)</option>
                        <option value="product_page">On Any Product Detail Page</option>
                        <option value="cart_page">On Cart Page View</option>
                      </select>
                    </div>

                    {triggerType === 'delay' && (
                      <div>
                        <label className="font-semibold text-ink block mb-1">Delay Seconds</label>
                        <input
                          type="number"
                          value={delaySeconds}
                          onChange={(e) => setDelaySeconds(Number(e.target.value))}
                          className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                        />
                      </div>
                    )}
                    {triggerType === 'scroll' && (
                      <div>
                        <label className="font-semibold text-ink block mb-1">Scroll Percentage (25, 50, 75)</label>
                        <input
                          type="number"
                          value={scrollPercentage}
                          onChange={(e) => setScrollPercentage(Number(e.target.value))}
                          className="w-full rounded-xl border border-border px-3 py-2 text-ink focus:border-quantum focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-ink block mb-1">Frequency Rule</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as PopupFrequencyType)}
                        className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                      >
                        <option value="every_visit">Every Visit</option>
                        <option value="session">Once Per Session</option>
                        <option value="daily">Once Every 24 Hours</option>
                        <option value="campaign">Once Per Campaign Duration</option>
                        <option value="once_until_closed">Once Until Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-ink block mb-1">Target Pages</label>
                      <input
                        type="text"
                        value={targetPages}
                        onChange={(e) => setTargetPages(e.target.value)}
                        placeholder="all, or /, /shop"
                        className="w-full rounded-xl border border-border px-3 py-2 bg-surface text-ink focus:border-quantum focus:outline-none"
                      />
                    </div>
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
                  </div>
                </div>

                {/* Colors & Visual Styling */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-ink block mb-1">Button Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={buttonColor}
                        onChange={(e) => setButtonColor(e.target.value)}
                        className="h-8 w-10 rounded border border-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={buttonColor}
                        onChange={(e) => setButtonColor(e.target.value)}
                        className="w-full rounded-lg border border-border px-2 py-1 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-ink block mb-1">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8 w-10 rounded border border-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-full rounded-lg border border-border px-2 py-1 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-ink block mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-8 w-10 rounded border border-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full rounded-lg border border-border px-2 py-1 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-4 flex justify-end gap-3 border-t border-border">
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
                    {editingPopup ? 'Update Popup' : 'Save & Publish Popup'}
                  </button>
                </div>
              </form>

              {/* Right Column: Interactive Live Preview */}
              <div className="lg:col-span-5 bg-slate-100 p-5 flex flex-col items-center justify-center border-t lg:border-t-0 overflow-y-auto">
                {/* Device Mode Switcher */}
                <div className="flex items-center gap-2 mb-4 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      previewDevice === 'desktop' ? 'bg-quantum text-white' : 'text-slate-600 hover:text-ink'
                    }`}
                  >
                    <FontAwesomeIcon icon={Icons.desktop} className="h-3 w-3" />
                    <span>Desktop Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      previewDevice === 'mobile' ? 'bg-quantum text-white' : 'text-slate-600 hover:text-ink'
                    }`}
                  >
                    <FontAwesomeIcon icon={Icons.phone} className="h-3 w-3" />
                    <span>Mobile Preview</span>
                  </button>
                </div>

                {/* Simulated Viewport Container */}
                <div
                  className={`transition-all duration-300 relative rounded-2xl overflow-hidden shadow-xl border border-slate-300 bg-white ${
                    previewDevice === 'mobile' ? 'w-[320px]' : 'w-full max-w-[420px]'
                  }`}
                  style={{ backgroundColor, color: textColor }}
                >
                  {/* Mock Close Button */}
                  <div className="absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center text-xs backdrop-blur-xs">
                    <FontAwesomeIcon icon={Icons.close} className="h-3 w-3" />
                  </div>

                  {/* Render Mock Layout */}
                  {layoutType === 'image_only' && imageUrl && (
                    <div className="relative">
                      <img src={imageUrl} alt={heading} className="w-full h-auto object-cover max-h-72" />
                    </div>
                  )}

                  {layoutType !== 'image_only' && (
                    <div>
                      {imageUrl && (
                        <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                          <img src={imageUrl} alt={heading} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          {badgeText && (
                            <span
                              className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider"
                              style={{ backgroundColor: buttonColor }}
                            >
                              {badgeText}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-5 text-center">
                        <h3 className="font-bold text-base text-ink" style={{ color: textColor }}>
                          {heading || 'Your Promo Title'}
                        </h3>
                        {subtitle && (
                          <p className="text-xs text-muted mt-1 leading-relaxed">
                            {subtitle}
                          </p>
                        )}
                        {description && (
                          <p className="text-[11px] text-muted/80 mt-1 leading-relaxed line-clamp-2">
                            {description}
                          </p>
                        )}

                        <div className="mt-4">
                          <button
                            type="button"
                            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white shadow-sm"
                            style={{ backgroundColor: buttonColor }}
                          >
                            {buttonText || 'Claim Offer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
