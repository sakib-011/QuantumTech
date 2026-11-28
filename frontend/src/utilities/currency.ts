import { Language } from '../types';

export function formatDigits(text: string, lang: Language = 'en'): string {
  if (lang !== 'bn') return text;

  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return text.replace(/[0-9]/g, (digit) => bengaliDigits[Number(digit)]);
}

/**
 * Format currency in Bangladeshi Taka (whole BDT with no decimals, per DATA-02)
 */
export function formatCurrency(amount: number, lang: Language = 'en'): string {
  const rounded = Math.round(amount);

  if (lang === 'bn') {
    return `৳${new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 }).format(rounded)}`;
  }

  return `৳${rounded.toLocaleString('en-IN')}`;
}

export function formatNumber(num: number | string, lang: Language = 'en'): string {
  const value = String(num);
  if (lang !== 'bn') return value;
  if (!value.trim()) return value;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  const fractionDigits = value.includes('.') && !value.includes('e')
    ? Math.min(value.length - value.indexOf('.') - 1, 20)
    : undefined;

  return new Intl.NumberFormat('bn-BD', {
    useGrouping: true,
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 20,
  }).format(numericValue);
}
