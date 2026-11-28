import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill' | 'row';
  tone?: 'default' | 'inverse';
  className?: string;
  id?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  tone = 'default',
  className = '',
  id,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { language } = useLanguage();

  const labelText = isDark
    ? language === 'bn' ? 'লাইট মোড' : 'Light Mode'
    : language === 'bn' ? 'ডার্ক মোড' : 'Dark Mode';

  const ariaLabel = isDark
    ? language === 'bn' ? 'লাইট মোডে পরিবর্তন করুন' : 'Switch to light mode'
    : language === 'bn' ? 'ডার্ক মোডে পরিবর্তন করুন' : 'Switch to dark mode';

  if (variant === 'pill') {
    return (
      <button
        id={id}
        type="button"
        onClick={toggleTheme}
        data-testid="theme-toggle-pill"
        className={`btn-base border ${
          tone === 'inverse'
            ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white'
            : 'border-border bg-surface text-ink hover:bg-surface-muted'
        } button-sm shadow-2xs transition-all duration-300 ease-brand ${className}`}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <FontAwesomeIcon
          icon={isDark ? Icons.sun : Icons.moon}
          className={`h-3.5 w-3.5 transition-transform duration-300 ${
            isDark ? 'text-amber-400 rotate-90' : 'text-quantum'
          }`}
        />
        <span className="caption-2 font-semibold">{labelText}</span>
      </button>
    );
  }

  if (variant === 'row') {
    return (
      <button
        id={id}
        type="button"
        onClick={toggleTheme}
        data-testid="theme-toggle-row-btn"
        className={`w-full flex items-center justify-between p-3 rounded-xl border border-border bg-surface-alt hover:bg-surface-muted transition-colors text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-quantum/30 ${className}`}
        aria-label={ariaLabel}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-quantum-soft text-quantum">
            <FontAwesomeIcon
              icon={isDark ? Icons.sun : Icons.moon}
              className={`h-4 w-4 ${isDark ? 'text-amber-400' : 'text-quantum'}`}
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="caption-2 font-bold text-ink">
              {language === 'bn' ? 'থিম মুড' : 'Appearance'}
            </span>
            <span className="caption-5 text-muted">
              {isDark
                ? language === 'bn' ? 'ডার্ক মোড সক্রিয়' : 'Dark mode enabled'
                : language === 'bn' ? 'লাইট মোড সক্রিয়' : 'Light mode enabled'}
            </span>
          </div>
        </div>

        <div
          className="relative inline-flex h-7 w-12 items-center rounded-full bg-surface-muted border border-border pointer-events-none"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full shadow-sm transition-transform duration-300 ease-brand flex items-center justify-center text-[10px] ${
              isDark
                ? 'translate-x-6 bg-quantum text-white'
                : 'translate-x-1 bg-surface text-ink border border-border'
            }`}
          >
            <FontAwesomeIcon icon={isDark ? Icons.moon : Icons.sun} className="h-2.5 w-2.5" />
          </span>
        </div>
      </button>
    );
  }

  // Default 'icon' button variant
  return (
    <button
      id={id}
      type="button"
      onClick={toggleTheme}
      data-testid="theme-toggle-btn"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`h-10 w-10 min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center transition-all duration-300 ease-brand shadow-2xs group focus:outline-none focus:border-quantum ${
        tone === 'inverse'
          ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
          : 'border-border bg-surface text-ink hover:bg-surface-muted'
      } ${className}`}
    >
      <FontAwesomeIcon
        icon={isDark ? Icons.sun : Icons.moon}
        className={`h-4 w-4 transition-transform duration-300 ${
          isDark
            ? 'text-amber-400 group-hover:rotate-45'
            : tone === 'inverse'
              ? 'text-quantum'
              : 'text-muted group-hover:text-quantum'
        }`}
      />
    </button>
  );
};
