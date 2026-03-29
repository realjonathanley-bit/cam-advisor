'use client';

import { useState, useEffect, useCallback } from 'react';

export type Lang = 'es' | 'en';

const STORAGE_KEY = 'tvigilo-idioma';

export function useLanguage() {
  const [lang, setLang] = useState<Lang>('es');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') setLang(saved);
  }, []);

  const setLanguage = useCallback((l: Lang) => {
    setLang(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  return { lang, setLanguage };
}
