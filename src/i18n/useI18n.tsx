import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import enUS from "@/locales/en-US.json";
import ptBR from "@/locales/pt-BR.json";
import esES from "@/locales/es-ES.json";

export type Locale = "en-US" | "pt-BR" | "es-ES";

const dictionaries: Record<Locale, Record<string, any>> = {
  "en-US": enUS,
  "pt-BR": ptBR,
  "es-ES": esES,
};

const STORAGE_KEY = "jamcircle_lang";

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && dictionaries[stored]) return stored;
  const nav = navigator.language;
  if (nav.startsWith("pt")) return "pt-BR";
  if (nav.startsWith("es")) return "es-ES";
  return "en-US";
}

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? path;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string) => getNestedValue(dictionaries[locale], key),
    [locale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
