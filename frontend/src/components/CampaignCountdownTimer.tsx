import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { formatNumber } from '../utilities/currency';

interface CampaignCountdownTimerProps {
  targetDate: string; // ISO date string
  label?: string;
  className?: string;
  onExpire?: () => void;
}

export const CampaignCountdownTimer: React.FC<CampaignCountdownTimerProps> = ({
  targetDate,
  label = 'Offer ends in:',
  className = '',
  onExpire,
}) => {
  const { language } = useLanguage();
  const formatTimeUnit = (value: number) =>
    formatNumber(value, language).padStart(2, language === 'bn' ? '০' : '0');
  const timeLabels = language === 'bn'
    ? { days: 'দিন', hours: 'ঘণ্টা', minutes: 'মিনিট', seconds: 'সেকেন্ড' }
    : { days: 'd', hours: 'h', minutes: 'm', seconds: 's' };
  const labelClassName = `caption-5 text-ink/70 ${
    language === 'bn' ? 'font-medium' : 'text-[9px] font-sans uppercase'
  }`;

  const calculateTimeLeft = () => {
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated.expired) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) return null;

  return (
    <div data-testid="campaign-countdown-timer" className={`inline-flex flex-wrap items-center gap-2.5 ${className}`}>
      {label && (
        <span className="caption-3 font-semibold uppercase tracking-wider flex items-center gap-1.5 text-ink opacity-90">
          <FontAwesomeIcon icon={Icons.clock} className="h-3 w-3 text-quantum" />
          <span>{label}</span>
        </span>
      )}
      <div className="flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums text-ink">
        <div className="flex flex-col items-center bg-surface-muted px-2 py-1 rounded-lg border border-border shadow-2xs min-w-[36px]">
          <span>{formatTimeUnit(timeLeft.days)}</span>
          <span className={labelClassName}>{timeLabels.days}</span>
        </div>
        <span className="text-ink/70 font-bold">:</span>
        <div className="flex flex-col items-center bg-surface-muted px-2 py-1 rounded-lg border border-border shadow-2xs min-w-[36px]">
          <span>{formatTimeUnit(timeLeft.hours)}</span>
          <span className={labelClassName}>{timeLabels.hours}</span>
        </div>
        <span className="text-ink/70 font-bold">:</span>
        <div className="flex flex-col items-center bg-surface-muted px-2 py-1 rounded-lg border border-border shadow-2xs min-w-[36px]">
          <span>{formatTimeUnit(timeLeft.minutes)}</span>
          <span className={labelClassName}>{timeLabels.minutes}</span>
        </div>
        <span className="text-ink/70 font-bold">:</span>
        <div className="flex flex-col items-center bg-surface-muted px-2 py-1 rounded-lg border border-border shadow-2xs min-w-[36px]">
          <span>{formatTimeUnit(timeLeft.seconds)}</span>
          <span className={labelClassName}>{timeLabels.seconds}</span>
        </div>
      </div>
    </div>
  );
};
