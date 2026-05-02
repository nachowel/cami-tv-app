export const dailyContentValidationRules = {
  arabicMaxChars: 180,
  translationMaxChars: 220,
} as const;

interface DailyContentValidationInput {
  arabic: string;
  translation: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDailyContent(content: DailyContentValidationInput): ValidationResult {
  const errors: string[] = [];

  if (content.arabic.length > dailyContentValidationRules.arabicMaxChars) {
    errors.push("Arabic text is too long for TV display (max 180 characters)");
  }

  if (content.translation.length > dailyContentValidationRules.translationMaxChars) {
    errors.push("Translation text is too long for TV display (max 220 characters)");
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}
