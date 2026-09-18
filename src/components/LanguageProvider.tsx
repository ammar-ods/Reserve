'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ar as arDateLocale, enUS as enDateLocale } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { DEFAULT_LANG, Lang, translate } from '@/lib/i18n';
import { UserSession } from '@/lib/types';

interface LanguageContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  dateLocale: Locale;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'reserve_lang';

function storedUserRole(): string | null {
  try {
    const saved = localStorage.getItem('reserve_user');
    if (!saved) return null;
    const parsed = JSON.parse(saved) as UserSession;
    return parsed?.role || null;
  } catch {
    return null;
  }
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Arabic is the only language for hosts and admins; the stored preference
  // applies exclusively to the Super Admin.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === 'en' && storedUserRole() === 'SUPER_ADMIN') {
      setLangState('en');
    } else {
      setLangState(DEFAULT_LANG);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      dateLocale: lang === 'ar' ? arDateLocale : enDateLocale,
      setLang,
      toggleLang: () => setLang(lang === 'ar' ? 'en' : 'ar'),
      t: (key, vars) => translate(key, lang, vars),
    }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so components never crash outside the provider.
    return {
      lang: DEFAULT_LANG,
      dir: 'rtl',
      dateLocale: arDateLocale,
      setLang: () => {},
      toggleLang: () => {},
      t: (key, vars) => translate(key, DEFAULT_LANG, vars),
    };
  }
  return ctx;
}
