import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';

interface NavigationProps {
  onItemClick?: () => void;
  className?: string;
  isMobile?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  onItemClick,
  className = '',
  isMobile = false,
}) => {
  const { t } = useLanguage();

  const navLinks = [
    { to: '/', label: t.nav.home, icon: Icons.store },
    { to: '/shop', label: t.nav.shop, icon: Icons.category },
    { to: '/track-order', label: t.nav.trackOrder, icon: Icons.delivery },
    { to: '/about', label: t.nav.about, icon: Icons.user },
    { to: '/contact', label: t.nav.contact, icon: Icons.phone },
    { to: '/policies', label: t.nav.policies, icon: Icons.shield },
    { to: '/admin', label: t.nav.admin, icon: Icons.dashboard },
  ];

  if (isMobile) {
    return (
      <nav className={`flex flex-col gap-1 w-full ${className}`}>
        {navLinks.map((link, idx) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onItemClick}
            style={{ animationDelay: `${idx * 50}ms` }}
            className={({ isActive }) =>
              `flex items-center gap-3.5 whitespace-nowrap px-4 py-3 rounded-xl title-3 transition-all duration-300 ${
                isActive
                  ? 'bg-quantum text-white font-semibold shadow-sm'
                  : 'text-ink hover:bg-surface-muted hover:text-quantum'
              }`
            }
          >
            <FontAwesomeIcon icon={link.icon} className="h-4 w-4" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <nav className={`flex items-center gap-1 lg:gap-2 ${className}`}>
      {navLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `whitespace-nowrap px-2 py-2 rounded-lg text-sm transition-all duration-300 font-medium ${
              isActive
                ? 'bg-quantum-soft text-quantum font-semibold'
                : 'text-ink hover:text-quantum hover:bg-surface-alt'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
};
