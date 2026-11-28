import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Breadcrumb } from '../components/Breadcrumb';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Icons } from '../utilities/icons';
import { settingsService } from '../services/settingsService';
import { isValidBangladeshPhone, isValidName } from '../utilities/validation';

export const ContactPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const [settings, setSettings] = useState(() => settingsService.getSettings());

  useEffect(() => {
    const handleSync = () => setSettings(settingsService.getSettings());
    window.addEventListener('quantum_settings_updated', handleSync);
    return () => window.removeEventListener('quantum_settings_updated', handleSync);
  }, []);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Compatibility Question');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedData, setSubmittedData] = useState<{
    ticketId: string;
    name: string;
    phone: string;
    subject: string;
  } | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isValidName(name)) {
      newErrors.name = t.validation.nameRequired;
    }

    if (!isValidBangladeshPhone(phone)) {
      newErrors.phone = t.validation.phoneRequired;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.validation.emailInvalid;
    }

    if (!message.trim() || message.trim().length < 8) {
      newErrors.message = t.validation.messageRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast(
        language === 'bn' ? 'ফর্মের ভুলগুলো সংশোধন করুন।' : 'Please fix the errors in the form.',
        'error'
      );
      return;
    }

    const ticketId = `INQ-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    setSubmittedData({
      ticketId,
      name: name.trim(),
      phone: phone.trim(),
      subject,
    });

    showToast(
      language === 'bn'
        ? 'আপনার বার্তা সফলভাবে গ্রহণ করা হয়েছে!'
        : 'Your message has been sent successfully! Our team will respond promptly.',
      'success'
    );
  };

  const handleReset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setSubject('Compatibility Question');
    setMessage('');
    setErrors({});
    setSubmittedData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: t.nav.contact }]} />

      <div className="max-w-5xl mx-auto mt-6">
        {/* Header Introduction */}
        <div className="text-center mb-10">
          <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2 inline-block">
            {t.contact.title}
          </span>
          <h1 className="heading-4 sm:heading-2 font-bold text-ink">
            {t.contact.title}
          </h1>
          <p className="body-2 text-muted mt-2 max-w-xl mx-auto">
            {t.contact.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Direct Channels */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h2 className="title-2 font-bold text-ink mb-1">
              {t.contact.directChannels}
            </h2>

            {/* Phone Hotline */}
            <div className="p-4 rounded-xl bg-surface border border-border shadow-sm flex items-start gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-quantum-soft text-quantum flex-shrink-0">
                <FontAwesomeIcon icon={Icons.phone} className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="title-4 font-bold text-ink">
                  {t.contact.hotline}
                </h3>
                <p className="caption-4 text-muted mt-0.5">{t.contact.hotlineHours}</p>
                <a
                  href={`tel:${settings.phone}`}
                  className="title-3 font-bold text-quantum hover:underline block mt-1"
                >
                  {settings.phone}
                </a>
              </div>
            </div>

            {/* Email Support */}
            <div className="p-4 rounded-xl bg-surface border border-border shadow-sm flex items-start gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-quantum-soft text-quantum flex-shrink-0">
                <FontAwesomeIcon icon={Icons.email} className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="title-4 font-bold text-ink">
                  {t.contact.emailSupport}
                </h3>
                <p className="caption-4 text-muted mt-0.5">
                  {language === 'bn' ? '২৪ ঘণ্টার মধ্যে উত্তর দেওয়া হয়' : 'Average response within 2-4 hours'}
                </p>
                <a
                  href={`mailto:${settings.email}`}
                  className="caption-2 font-semibold text-quantum hover:underline block mt-1 truncate"
                >
                  {settings.email}
                </a>
              </div>
            </div>

            {/* WhatsApp Chat Support */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-sm flex items-start gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white flex-shrink-0">
                <FontAwesomeIcon icon={Icons.whatsapp} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="title-4 font-bold text-emerald-950">
                  {t.contact.whatsappChat}
                </h3>
                <p className="caption-4 text-emerald-800 mt-0.5">
                  {language === 'bn' ? 'সরাসরি দ্রুত সহায়তার জন্য' : 'Fast response for order queries'}
                </p>
                <a
                  href={`https://wa.me/88${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 button-sm mt-2 font-semibold shadow-xs"
                >
                  <FontAwesomeIcon icon={Icons.whatsapp} className="h-3.5 w-3.5" />
                  <span>{t.contact.whatsappChat}</span>
                </a>
              </div>
            </div>

            {/* Business Hours & Location */}
            <div className="p-4 rounded-xl bg-surface border border-border shadow-sm flex items-start gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-quantum-soft text-quantum flex-shrink-0">
                <FontAwesomeIcon icon={Icons.clock} className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="title-4 font-bold text-ink">
                  {t.contact.address}
                </h3>
                <p className="caption-3 font-semibold text-ink mt-0.5">
                  {settings.businessHours}
                </p>
                <p className="caption-4 text-muted mt-0.5 leading-snug">
                  {settings.address}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form with Validation */}
          <div className="lg:col-span-7 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
            {submittedData ? (
              <div className="p-6 rounded-2xl bg-success-soft/30 border border-success/30 text-center animate-fadeIn">
                <div className="h-16 w-16 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4 border border-success/20">
                  <FontAwesomeIcon icon={Icons.circleCheck} className="h-8 w-8" />
                </div>

                <span className="caption-4 px-3 py-1 rounded-full bg-surface border border-border text-muted font-mono font-semibold inline-block mb-2">
                  {t.contact.ticketId} #{submittedData.ticketId}
                </span>

                <h3 className="title-1 font-bold text-ink mb-2">
                  {t.contact.sentTitle}
                </h3>

                <p className="body-4 text-muted max-w-md mx-auto mb-6 leading-relaxed">
                  {language === 'bn'
                    ? `ধন্যবাদ, ${submittedData.name}! আপনার বিষয়টি নথিভুক্ত করা হয়েছে। আমাদের সাপোর্ট টিম শীঘ্রই (${submittedData.phone}) নম্বরে যোগাযোগ করবে।`
                    : `Thank you, ${submittedData.name}! Your inquiry regarding "${submittedData.subject}" has been received. Our team will contact you at ${submittedData.phone} shortly.`}
                </p>

                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm h-11 px-6 font-semibold"
                >
                  <FontAwesomeIcon icon={Icons.refresh} className="h-3.5 w-3.5" />
                  <span>{language === 'bn' ? 'নতুন বার্তা পাঠান' : 'Send Another Message'}</span>
                </button>
              </div>
            ) : (
              <>
                <h2 className="title-1 font-bold text-ink mb-1">
                  {t.contact.formTitle}
                </h2>
                <p className="caption-2 text-muted mb-6">
                  {t.contact.formDesc}
                </p>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="contact-name" className="caption-3 font-semibold text-ink block mb-1">
                      {t.contact.fullName} <span className="text-error">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder={t.contact.fullNamePlaceholder}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                        errors.name ? 'border-error ring-1 ring-error' : 'border-border focus:ring-quantum'
                      }`}
                    />
                    {errors.name && <p className="caption-5 text-error mt-1">{errors.name}</p>}
                  </div>

                  {/* Phone & Email in Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-phone" className="caption-3 font-semibold text-ink block mb-1">
                        {t.contact.phone} <span className="text-error">*</span>
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                        }}
                        placeholder={t.contact.phonePlaceholder}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                          errors.phone ? 'border-error ring-1 ring-error' : 'border-border focus:ring-quantum'
                        }`}
                      />
                      {errors.phone && <p className="caption-5 text-error mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="caption-3 font-semibold text-ink block mb-1">
                        {t.contact.email}
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder={t.contact.emailPlaceholder}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                          errors.email ? 'border-error ring-1 ring-error' : 'border-border focus:ring-quantum'
                        }`}
                      />
                      {errors.email && <p className="caption-5 text-error mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label htmlFor="contact-subject" className="caption-3 font-semibold text-ink block mb-1">
                      {t.contact.subject}
                    </label>
                    <select
                      id="contact-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-quantum"
                    >
                      <option value="Compatibility Question">{t.contact.subjectCompatibility}</option>
                      <option value="Order Status & Delivery">{t.contact.subjectOrder}</option>
                      <option value="Warranty Claim">{t.contact.subjectWarranty}</option>
                      <option value="General Question">{t.contact.subjectGeneral}</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="contact-message" className="caption-3 font-semibold text-ink block mb-1">
                      {t.contact.message} <span className="text-error">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        if (errors.message) setErrors((prev) => ({ ...prev, message: '' }));
                      }}
                      placeholder={t.contact.messagePlaceholder}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                        errors.message ? 'border-error ring-1 ring-error' : 'border-border focus:ring-quantum'
                      }`}
                    />
                    {errors.message && <p className="caption-5 text-error mt-1">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm h-11 font-semibold mt-2"
                  >
                    <FontAwesomeIcon icon={Icons.send} className="h-4 w-4" />
                    <span>{t.contact.sendMessage}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
