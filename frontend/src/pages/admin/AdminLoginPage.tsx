import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Icons } from '../../utilities/icons';
import logoIcon from '../../assets/brand/logo-icon.png';
import { ToastContainer } from '../../components/Toast';
import { ThemeToggle } from '../../components/ThemeToggle';

export const AdminLoginPage: React.FC = () => {
  const { isAuthenticated, login, isLocked, lockTimeRemaining, rememberedEmail } = useAdminAuth();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState(rememberedEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to admin dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid administrator email address.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      void (async () => {
        const res = await login(email, password, rememberMe);
        setIsSubmitting(false);

        if (!res.success) {
          setError(res.error || 'Authentication failed. Please verify your credentials.');
        } else {
          const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
          navigate(from, { replace: true });
        }
      })();
    }, 250);
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-float">
        {/* Top Controls: Theme & Language */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="caption-4 text-muted hover:text-quantum flex items-center gap-1.5 transition-colors"
          >
            <FontAwesomeIcon icon={Icons.chevronLeft} className="h-3 w-3" />
            <span>{language === 'bn' ? 'স্টোরে ফিরে যান' : 'Back to Store'}</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="icon" className="h-8 w-8 min-h-[32px] min-w-[32px]" />

            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface-alt hover:bg-surface-muted text-xs font-semibold text-ink transition-colors"
            >
              <FontAwesomeIcon icon={Icons.language} className="h-3 w-3 text-quantum" />
              <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
            </button>
          </div>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/" className="inline-block group mb-3">
            <img
              src={logoIcon}
              alt="QuantumTech"
              className="h-12 w-12 object-contain group-hover:scale-105 transition-transform"
            />
          </Link>
          <span className="caption-4 px-2.5 py-0.5 rounded-full bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-2">
            {language === 'bn' ? 'স্টোর ম্যানেজমেন্ট' : 'Store Management'}
          </span>
          <h1 className="heading-6 font-bold text-ink">
            {language === 'bn' ? 'কোয়ান্টাম টেক অ্যাডমিন পোর্টাল' : 'QuantumTech Admin Portal'}
          </h1>
          <p className="caption-2 text-muted mt-1">
            {t.admin.login.subtitle}
          </p>
        </div>

        {/* Error / Lockout Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-error-soft/40 border border-error/30 text-error text-xs flex items-start gap-2.5 animate-fadeIn">
            <FontAwesomeIcon icon={Icons.warning} className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {isLocked ? (
          <div className="p-6 rounded-2xl bg-error-soft/30 border border-error/40 text-center text-error">
            <div className="h-12 w-12 rounded-full bg-error-soft text-error flex items-center justify-center mx-auto mb-3">
              <FontAwesomeIcon icon={Icons.lock} className="h-6 w-6" />
            </div>
            <h3 className="title-2 font-bold text-ink">Account Temporarily Locked</h3>
            <p className="caption-2 text-muted mt-1 leading-relaxed">
              5 consecutive failed attempts detected (SRS FR-21). For store protection, access is temporarily suspended.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-surface border border-border inline-block">
              <span className="caption-3 text-muted block">Retry available in</span>
              <span className="font-mono text-lg font-bold text-error">{lockTimeRemaining} seconds</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Email Field */}
            <div>
              <label htmlFor="admin-email" className="caption-3 font-semibold text-ink block mb-1">
                Admin Email <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Admin email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft pr-10"
                />
                <div className="absolute right-3 top-3 text-muted">
                  <FontAwesomeIcon icon={Icons.email} className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label htmlFor="admin-password" className="caption-3 font-semibold text-ink block mb-1">
                Admin Passcode <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-muted hover:text-ink focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <FontAwesomeIcon icon={showPassword ? Icons.eyeSlash : Icons.eye} className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-quantum focus:ring-quantum h-4 w-4"
                />
                <span>{t.admin.login.rememberMe}</span>
              </label>

            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm h-11 w-full justify-center font-semibold mt-2"
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={Icons.spinner} className="h-4 w-4 animate-spin" />
                  <span>{t.admin.login.signingIn}</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={Icons.lock} className="h-4 w-4" />
                  <span>{language === 'bn' ? t.admin.login.signIn : 'Sign In to Dashboard'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Back Link */}
        <div className="mt-6 text-center border-t border-border pt-4">
          <Link
            to="/"
            className="caption-3 text-quantum hover:underline inline-flex items-center justify-center gap-1.5 font-medium"
          >
            <FontAwesomeIcon icon={Icons.chevronLeft} className="h-2.5 w-2.5" />
            <span>Back to Storefront</span>
          </Link>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};
