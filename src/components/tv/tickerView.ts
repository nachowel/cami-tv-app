import type { DisplayLanguage, TickerCurrent } from "../../types/display.ts";

interface ResolveTickerDisplayTextOptions {
  ticker: TickerCurrent;
  language: DisplayLanguage;
  fallbackText: string;
}

export function resolveTickerDisplayText({
  ticker,
  language,
  fallbackText,
}: ResolveTickerDisplayTextOptions) {
  let text = ticker.text[language].trim();

  if (!text) {
    const otherLanguage = language === "en" ? "tr" : "en";
    text = ticker.text[otherLanguage].trim();
  }

  if (!text) {
    text = fallbackText;
  }

  if (ticker.type === "hadith") {
    const suffix = language === "en" ? " (Hadith)" : " (Hadis)";
    text = `${text}${suffix}`;
  }

  return text;
}
