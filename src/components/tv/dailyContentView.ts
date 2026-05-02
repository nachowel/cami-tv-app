import type { DailyContentCurrent, DisplayLanguage } from "../../types/display.ts";

interface ResolveDailyContentTextOptions {
  content: DailyContentCurrent;
  fallbackText: string;
  language: DisplayLanguage;
}

interface ResolveDailyContentSourceOptions {
  content: DailyContentCurrent;
  fallbackSource: string;
  language: DisplayLanguage;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

export function resolveDailyContentDisplayText({
  content,
  fallbackText,
  language,
}: ResolveDailyContentTextOptions) {
  const localizedText = content.translation[language];

  if (hasText(localizedText)) {
    return localizedText;
  }

  if (language !== "en" && hasText(content.translation.en)) {
    return content.translation.en;
  }

  return fallbackText;
}

export function resolveDailyContentDisplaySource({
  content,
  fallbackSource,
}: ResolveDailyContentSourceOptions) {
  return hasText(content.source) ? content.source : fallbackSource;
}
