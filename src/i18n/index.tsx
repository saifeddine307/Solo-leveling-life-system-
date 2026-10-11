import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, Direction, TranslationDictionary } from './types';
import { en } from './en';
import { ar } from './ar';

export type { Language, Direction, TranslationDictionary };

interface I18nContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDictionary, fallback?: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, TranslationDictionary> = {
  en,
  ar,
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18N_STORAGE_KEY = 'solo_system_language';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(I18N_STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') return saved;
      // Default to English
      return 'en';
    } catch {
      return 'en';
    }
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = direction === 'rtl';

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(I18N_STORAGE_KEY, newLang);
    } catch (e) {
      console.error('Failed to save language preference', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    if (language === 'ar') {
      document.body.classList.add('rtl-arabic');
    } else {
      document.body.classList.remove('rtl-arabic');
    }
  }, [language, direction]);

  const t = useMemo(() => {
    return (key: keyof TranslationDictionary, fallback?: string): string => {
      const dict = translations[language] || translations.en;
      if (dict && key in dict) {
        return dict[key];
      }
      if (translations.en && key in translations.en) {
        return translations.en[key];
      }
      return fallback || String(key);
    };
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, direction, setLanguage, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    const fallbackT = (key: keyof TranslationDictionary, fallback?: string) => en[key] || fallback || String(key);
    return {
      language: 'en',
      direction: 'ltr',
      setLanguage: () => {},
      t: fallbackT,
      isRTL: false,
    };
  }
  return ctx;
}
