import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
} from "react";
import {Platform} from "react-native";

import type {TranslationKey} from "./en";
import {
  defaultUILanguage,
  getUILanguageFromSettings,
  translate,
} from "./translation";
import type {TranslationValues, UILanguage} from "./types";

import {useAppData} from "@/context/AppDataContext";

interface LocalizationContextValue {
  language: UILanguage;
  setLanguage: (language: UILanguage) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  formatNumber: (value: number) => string;
  formatDate: (value: Date | number) => string;
}

const LocalizationContext = createContext<LocalizationContextValue>({
  language: defaultUILanguage,
  setLanguage: () => {},
  t: key => translate(defaultUILanguage, key),
  formatNumber: value => String(value),
  formatDate: value => new Date(value).toLocaleDateString("en"),
});

interface LocalizationProviderProps {
  children: React.ReactNode;
}

export function LocalizationProvider({children}: LocalizationProviderProps) {
  const {appSettings, updateSettings} = useAppData();
  const language = getUILanguageFromSettings(appSettings);
  useEffect(() => {
    if (!appSettings.koreanTVMigration && Platform.isTV) {
      updateSettings({
        uiLanguage: "ko",
        languageSelected: "ko",
        koreanTVMigration: true,
      });
    }
  }, [appSettings.koreanTVMigration, updateSettings]);
  const locale =
    language === "ko" ? "ko-KR" : language === "de" ? "de-DE" : "en-US";

  const setLanguage = useCallback(
    (nextLanguage: UILanguage) => {
      updateSettings({uiLanguage: nextLanguage});
    },
    [updateSettings],
  );

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, values) => translate(language, key, values),
      formatNumber: number => new Intl.NumberFormat(locale).format(number),
      formatDate: date =>
        new Intl.DateTimeFormat(locale, {dateStyle: "medium"}).format(date),
    }),
    [language, locale, setLanguage],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LocalizationContext);
}
