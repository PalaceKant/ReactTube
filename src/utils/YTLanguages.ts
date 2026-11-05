import {Platform} from "react-native";

import {AppSettings} from "../context/AppDataContext";

interface Language {
  key: string;
  label: string;
}

export const languages: Language[] = [
  {key: "ko", label: "한국어"},
  {
    key: "en",
    label: "English",
  },
  {
    key: "de",
    label: "Deutsch",
  },
];

export function parseLanguage(appSettings: AppSettings) {
  const requested =
    Platform.isTV && !appSettings.koreanTVMigration
      ? "ko"
      : (appSettings.languageSelected ?? "en");
  return (
    languages.find(v => v.key === requested) ??
    languages.find(v => v.key === "en")!
  );
}
