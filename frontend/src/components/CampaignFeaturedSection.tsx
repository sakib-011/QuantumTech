import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Campaign, Product } from '../types';
import { CampaignCountdownTimer } from './CampaignCountdownTimer';
import { Icons } from '../utilities/icons';
import { useLanguage } from '../context/LanguageContext';

interface CampaignFeaturedSectionProps {
  campaign: Campaign;
  products?: Product[];
}

export const CampaignFeaturedSection: React.FC<CampaignFeaturedSectionProps> = ({
  campaign,
}) => {
  const { language } = useLanguage();

  const campaignTitle = language === 'bn' && campaign.nameBn ? campaign.nameBn : campaign.name;
  const campaignDesc = language === 'bn' && campaign.descriptionBn ? campaign.descriptionBn : campaign.description;
  const targetLink = campaign.landingPageSlug
    ? `/campaign/${campaign.landingPageSlug}`
    : (campaign.customCtaLink || '/shop');

  return (
    <section
      data-testid="campaign-featured-section"
      className="py-8 sm:py-10 bg-gradient-to-r from-surface via-surface-alt to-surface border-b border-border relative overflow-hidden"
    >
      {/* Decorative Brand Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-quantum/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Campaign Banner Header with Badges, Title, Countdown & CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl flex flex-col items-start gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="caption-3 px-3 py-1 rounded-full bg-quantum text-white font-bold uppercase tracking-wider shadow-2xs">
                {campaign.badgeText || campaign.occasion}
              </span>
              <span className="caption-3 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5">
                <FontAwesomeIcon icon={Icons.check} className="h-2.5 w-2.5 text-emerald-600" />
                <span>Verified Discounts</span>
              </span>
            </div>

            <h2 className="heading-4 sm:heading-2 font-bold text-ink leading-tight">
              {campaignTitle}
            </h2>

            <p className="body-3 text-muted leading-relaxed">
              {campaignDesc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-shrink-0">
            {campaign.showCountdown && campaign.endDate && (
              <CampaignCountdownTimer
                targetDate={campaign.endDate}
                label={language === 'bn' ? 'অফার শেষ হতে বাকি:' : 'DEALS END IN:'}
                className="bg-surface p-2.5 sm:p-3 rounded-2xl border border-border shadow-xs"
              />
            )}

            <Link
              to={targetLink}
              className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-xs h-11 px-6 whitespace-nowrap self-stretch sm:self-auto text-center font-semibold flex items-center justify-center"
            >
              <span>{campaign.customCtaText || (language === 'bn' ? 'সব অফার দেখুন' : 'Shop Eid Offers')}</span>
              <FontAwesomeIcon icon={Icons.arrowRight} className="h-3 w-3 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
