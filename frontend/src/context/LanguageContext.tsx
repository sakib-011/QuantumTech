import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import { translations, getTranslation } from '../utilities/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return getItem<Language>(STORAGE_KEYS.LANGUAGE, 'en');
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setItem(STORAGE_KEYS.LANGUAGE, lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
