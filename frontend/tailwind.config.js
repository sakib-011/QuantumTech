/** @type {import('tailwindcss').Config} */
function withAlpha(varName) {
  return `rgb(var(${varName}) / <alpha-value>)`;
}

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: withAlpha('--color-ink'),
          light: '#1E293B',
          dark: '#020617',
        },
        quantum: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          active: '#1E40AF',
          soft: withAlpha('--color-quantum-soft'),
          dark: '#0B132B',
        },
        surface: {
          DEFAULT: withAlpha('--color-surface'),
          alt: withAlpha('--color-surface-alt'),
          muted: withAlpha('--color-surface-muted'),
        },
        border: {
          DEFAULT: withAlpha('--color-border'),
          focus: '#93C5FD',
          dark: withAlpha('--color-border-dark'),
        },
        muted: {
          DEFAULT: withAlpha('--color-muted'),
          light: withAlpha('--color-muted-light'),
          dark: withAlpha('--color-muted-dark'),
        },
        success: {
          DEFAULT: '#16A34A',
          soft: '#DCFCE7',
          dark: '#15803D',
        },
        error: {
          DEFAULT: '#DC2626',
          soft: '#FEE2E2',
          dark: '#B91C1C',
        },
        warning: {
          DEFAULT: '#D97706',
          soft: '#FEF3C7',
          dark: '#B45309',
        },
      },
      spacing: {
        '0': '0px',
        '25': '2px',
        '50': '4px',
        '75': '8px',
        '100': '12px',
        '200': '16px',
        '300': '24px',
        '400': '32px',
        '500': '40px',
        '600': '48px',
        '700': '64px',
        '800': '80px',
        '900': '96px',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Bengali', 'Hind Siliguri', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'Hind Siliguri', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Noto Sans Bengali', 'Hind Siliguri', 'monospace'],
      },
      screens: {
        'xs': '360px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1366px',
        '3xl': '1920px',
      },
      transitionTimingFunction: {
        'brand': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        '300': '300ms',
        '500': '500ms',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
        'float': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
