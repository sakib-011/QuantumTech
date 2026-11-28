import React, { useState } from 'react';
import { Outlet, NavLink, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import logoIcon from '../assets/brand/logo-icon.png';
import { ToastContainer } from '../components/Toast';
import { ThemeToggle } from '../components/ThemeToggle';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, adminUser, logout } = useAdminAuth();
  const { language, setLanguage, t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // If not authenticated, redirect to the dedicated Admin Login route
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { to: '/admin/dashboard', label: t.admin.nav.dashboard, icon: Icons.dashboard },
    { to: '/admin/products', label: t.admin.nav.products, icon: Icons.package },
    { to: '/admin/categories', label: t.admin.nav.categories, icon: Icons.category },
    { to: '/admin/orders', label: t.admin.nav.orders, icon: Icons.order },
    { to: '/admin/customers', label: t.admin.nav.customers, icon: Icons.user },
    { to: '/admin/reviews', label: t.admin.nav.reviews, icon: Icons.reviews },
    { to: '/admin/campaigns', label: t.admin.nav.campaigns, icon: Icons.campaign },
    { to: '/admin/popups', label: t.admin.nav.popups, icon: Icons.popup },
    { to: '/admin/discounts', label: t.admin.nav.discounts, icon: Icons.discount },
    { to: '/admin/coupons', label: t.admin.nav.coupons, icon: Icons.coupon },
    { to: '/admin/campaign-analytics', label: t.admin.nav.analytics, icon: Icons.analytics },
    { to: '/admin/settings', label: t.admin.nav.settings, icon: Icons.settings },
  ];

  const handleSignOut = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-surface-alt flex flex-col md:h-screen md:flex-row md:overflow-hidden text-ink">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-2.5 sm:px-4 py-2 bg-slate-900 text-white border-b border-slate-800 z-40 sticky top-0 min-h-[52px]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle navigation drawer"
          >
            <FontAwesomeIcon icon={sidebarOpen ? Icons.close : Icons.menu} className="h-4.5 w-4.5" />
          </button>
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <img src={logoIcon} alt="QuantumTech" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
            <span className="text-sm sm:title-3 font-bold text-white tracking-tight">QuantumTech</span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Theme Toggle Mobile - VISIBLE ON ALL SCREENS */}
          <ThemeToggle
            variant="icon"
            tone="inverse"
            className="h-10 w-10 min-h-[40px] min-w-[40px]"
          />

          {/* Language Switcher Mobile */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="h-10 min-h-[40px] px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center"
            title="Switch Language"
          >
            {language === 'en' ? 'বাংলা' : 'EN'}
          </button>

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center text-slate-300 hover:text-white rounded-lg"
            title="Open Storefront"
          >
            <FontAwesomeIcon icon={Icons.store} className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="h-10 min-h-[40px] text-xs text-error hover:bg-error-soft/20 px-2 sm:px-3 rounded-lg border border-error/30 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={Icons.logout} className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">{t.admin.nav.logout}</span>
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/70 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-ink text-slate-300 border-r border-slate-800 flex flex-col z-50 transition-all duration-300 ease-brand ${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand / Logo Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <Link
            to="/admin/dashboard"
            className={`flex items-center gap-2.5 overflow-hidden ${
              sidebarCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <img src={logoIcon} alt="QuantumTech" className="h-9 w-9 sm:h-10 sm:w-10 object-contain flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="heading-6 font-bold text-white tracking-tight leading-none">
                  Quantum<span className="text-quantum">Tech</span>
                </span>
                <span className="caption-5 text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                  Admin Portal
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FontAwesomeIcon
              icon={sidebarCollapsed ? Icons.chevronRight : Icons.chevronLeft}
              className="h-3 w-3"
            />
          </button>
        </div>

        {/* User Card */}
        <div className={`p-4 border-b border-slate-800/80 bg-slate-900/60 ${sidebarCollapsed ? 'text-center' : ''}`}>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-quantum text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                <FontAwesomeIcon icon={Icons.user} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="caption-5 text-slate-400 block uppercase tracking-wider">Logged in as</span>
                <span className="title-4 font-semibold text-white block truncate">{adminUser?.name || 'Administrator'}</span>
                <span className="caption-5 text-quantum-soft inline-block px-1.5 py-0.2 rounded bg-quantum/20 mt-0.5">
                  {adminUser?.role || 'Store Owner'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title={`${adminUser?.name} (${adminUser?.role})`}>
              <div className="h-8 w-8 rounded-full bg-quantum text-white flex items-center justify-center font-bold text-xs">
                <FontAwesomeIcon icon={Icons.user} className="h-3.5 w-3.5" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  sidebarCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-quantum text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800 flex flex-col gap-1.5 bg-slate-950/40">
          <ThemeToggle
            variant={sidebarCollapsed ? 'icon' : 'pill'}
            tone="inverse"
            className={`w-full text-xs ${
              sidebarCollapsed ? 'justify-center mx-auto' : 'justify-start'
            }`}
          />

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            title={sidebarCollapsed ? 'Open Customer Storefront' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <FontAwesomeIcon icon={Icons.external} className="h-3.5 w-3.5 flex-shrink-0 text-quantum" />
            {!sidebarCollapsed && <span>Live Storefront</span>}
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-error hover:bg-error-soft/10 transition-colors w-full text-left ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <FontAwesomeIcon icon={Icons.logout} className="h-3.5 w-3.5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col min-w-0 overflow-y-auto md:min-h-0 transition-[margin] duration-300 ease-brand ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-surface border-b border-border sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="caption-3 font-semibold text-slate-500 uppercase tracking-wider">
              QuantumTech Enterprise Store Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle in Admin Desktop Header */}
            <ThemeToggle variant="pill" />

            {/* Language Toggle in Admin */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-ink transition-colors shadow-2xs"
              title="Switch Language"
            >
              <FontAwesomeIcon icon={Icons.language} className="h-3.5 w-3.5 text-quantum" />
              <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
            </button>

            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-sm shadow-2xs"
            >
              <FontAwesomeIcon icon={Icons.store} className="h-3.5 w-3.5 text-quantum" />
              <span>{t.admin.nav.storefront}</span>
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-muted text-ink transition-colors focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-quantum text-white flex items-center justify-center font-bold text-xs">
                  <FontAwesomeIcon icon={Icons.user} className="h-3.5 w-3.5" />
                </div>
                <div className="text-left text-xs leading-none hidden lg:block">
                  <span className="font-bold text-ink block">{adminUser?.name || 'Admin'}</span>
                  <span className="text-[10px] text-muted">{adminUser?.role || 'Owner'}</span>
                </div>
                <FontAwesomeIcon icon={Icons.chevronDown} className="h-2.5 w-2.5 text-muted ml-1" />
              </button>

              {profileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-border shadow-float py-2 z-30"
                  onMouseLeave={() => setProfileMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-border text-xs">
                    <span className="font-semibold text-ink block truncate">{adminUser?.name}</span>
                    <span className="caption-5 text-muted block truncate">{adminUser?.email}</span>
                  </div>
                  <Link
                    to="/admin/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-ink hover:bg-surface-muted transition-colors"
                  >
                    <FontAwesomeIcon icon={Icons.settings} className="h-3.5 w-3.5 text-muted" />
                    <span>Store Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-error hover:bg-error-soft/20 w-full text-left transition-colors"
                  >
                    <FontAwesomeIcon icon={Icons.logout} className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Routed Subpage Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>

      <ToastContainer />
    </div>
  );
};
