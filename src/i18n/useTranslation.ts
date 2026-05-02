import type { DisplayLanguage } from "../types/display";
import { defaultLanguage, translations, type TranslationKey } from "./translations";

export function useTranslation(language: DisplayLanguage = defaultLanguage) {
  const dictionary = translations[language] ?? translations[defaultLanguage];

  return {
    language,
    t: (key: TranslationKey) => dictionary[key] ?? translations[defaultLanguage][key],
  };
}
