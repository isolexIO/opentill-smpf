import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { LANGUAGES, DEFAULT_LANGUAGE, translations } from './translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'opentill_language';

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch (e) {}
  // Fall back to browser language if it matches a supported one.
  try {
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (LANGUAGES.some((l) => l.code === browser)) return browser;
  } catch (e) {}
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const dir = LANGUAGES.find((l) => l.code === language)?.dir || 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    try { localStorage.setItem(STORAGE_KEY, language); } catch (e) {}
  }, [language, dir]);

  const setLanguage = useCallback((code) => {
    if (LANGUAGES.some((l) => l.code === code)) setLanguageState(code);
  }, []);

  const t = useCallback(
    (key) => {
      const dict = translations[language] || translations[DEFAULT_LANGUAGE] || {};
      if (key in dict) return dict[key];
      const fallback = translations[DEFAULT_LANGUAGE] || {};
      return key in fallback ? fallback[key] : key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback if used outside provider (shouldn't happen, but keeps app resilient).
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key) => (translations[DEFAULT_LANGUAGE] && translations[DEFAULT_LANGUAGE][key]) || key,
      dir: 'ltr',
      languages: LANGUAGES,
    };
  }
  return ctx;
}