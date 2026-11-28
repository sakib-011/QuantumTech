import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SearchBar } from '../components/SearchBar';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';

export const NotFoundPage: React.FC = () => {
  const { t } = useLanguage();
  const nf = t.notFound;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center max-w-lg mx-auto">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-quantum-soft text-quantum mb-6 shadow-sm">
        <FontAwesomeIcon icon={Icons.warning} className="h-10 w-10" />
      </div>

      <span className="caption-3 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold mb-3 border border-slate-200">
        {nf.badge}
      </span>

      <h1 className="heading-4 sm:heading-3 font-bold text-ink mb-3">
        {nf.title}
      </h1>

      <p className="body-4 text-muted mb-8 leading-relaxed">
        {nf.description}
      </p>

      <div className="w-full mb-8">
        <SearchBar placeholder={nf.searchPlaceholder} />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          to="/"
          className="btn-base bg-quantum text-white hover:bg-quantum-hover button-md shadow-sm w-full sm:w-auto justify-center"
        >
          <FontAwesomeIcon icon={Icons.store} className="h-4 w-4" />
          <span>{nf.backHome}</span>
        </Link>
        <Link
          to="/shop"
          className="btn-base bg-surface border border-border text-ink hover:bg-surface-muted button-md w-full sm:w-auto justify-center"
        >
          <FontAwesomeIcon icon={Icons.category} className="h-4 w-4" />
          <span>{nf.browseGadgets}</span>
        </Link>
      </div>
    </div>
  );
};
