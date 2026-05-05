import type { DailyContentType, TickerType } from "../types/display";

export const dailyContentValidationRules = {
  arabicMaxChars: 180,
  translationMaxChars: 220,
} as const;

export const announcementValidationRules = {
  textMaxChars: 140,
} as const;

export const tickerValidationRules = {
  textMaxChars: 120,
} as const;

export interface ValidationResult<TField extends string = string> {
  valid: boolean;
  errors: string[];
  fieldErrors: Partial<Record<TField, string>>;
}

interface AnnouncementValidationInput {
  expiresOn?: string;
  textEn: string;
  textTr: string;
}

interface DailyContentValidationInput {
  arabic: string;
  source: string;
  translationEn: string;
  translationTr: string;
  type: DailyContentType | string;
}

function buildValidationResult<TField extends string>(
  fieldErrors: Partial<Record<TField, string>>,
): ValidationResult<TField> {
  const errors = Object.values(fieldErrors).filter((value): value is string => Boolean(value));

  return {
    errors,
    fieldErrors,
    valid: errors.length === 0,
  };
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateDonationAmount(value: string): ValidationResult<"amount"> {
  const trimmed = value.trim();

  if (!trimmed) {
    return buildValidationResult({
      amount: "Bağış tutarı gerekli.",
    });
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return buildValidationResult({
      amount: "Bağış tutarı geçerli bir sayı olmalıdır.",
    });
  }

  if (parsed < 0) {
    return buildValidationResult({
      amount: "Bağış tutarı 0 veya daha büyük olmalıdır.",
    });
  }

  return buildValidationResult({});
}

export function validateDonationUrl(value: string): ValidationResult<"url"> {
  const trimmed = value.trim();

  if (!trimmed) {
    return buildValidationResult({
      url: "Bağış bağlantısı gerekli.",
    });
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    return buildValidationResult({
      url: "Bağış bağlantısı geçerli bir http/https adresi olmalıdır.",
    });
  }

  return buildValidationResult({});
}

export function validateDonationDisplayQrUrl(input: {
  qrUrl: string;
  showQrCode: boolean;
}): ValidationResult<"qrUrl"> {
  const trimmed = input.qrUrl.trim();

  if (!trimmed) {
    if (input.showQrCode) {
      return buildValidationResult({
        qrUrl: "QR URL is required when Show QR code is enabled.",
      });
    }
    return buildValidationResult({});
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    return buildValidationResult({
      qrUrl: "QR URL must be a valid http/https address.",
    });
  }

  return buildValidationResult({});
}

export function validateBackgroundImageUrl(input: {
  backgroundImageUrl: string;
  displayMode: "component" | "image";
}): ValidationResult<"backgroundImageUrl"> {
  const trimmed = input.backgroundImageUrl.trim();

  if (input.displayMode !== "image") {
    return buildValidationResult({});
  }

  if (!trimmed) {
    return buildValidationResult({
      backgroundImageUrl: "Background image URL is required in image mode.",
    });
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    return buildValidationResult({
      backgroundImageUrl: "Background image URL must be a valid http/https address.",
    });
  }

  return buildValidationResult({});
}

export function validatePrayerTime(value: string): ValidationResult<"time"> {
  if (!value.trim()) {
    return buildValidationResult({
      time: "Namaz vakti gerekli.",
    });
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    return buildValidationResult({
      time: "Namaz vakti 00:00 ile 23:59 arasında HH:mm formatında olmalıdır.",
    });
  }

  return buildValidationResult({});
}

export function validateAnnouncement(
  announcement: AnnouncementValidationInput,
): ValidationResult<"textEn" | "textTr" | "expiresOn"> {
  const fieldErrors: ValidationResult<"textEn" | "textTr" | "expiresOn">["fieldErrors"] = {};

  if (!announcement.textEn.trim()) {
    fieldErrors.textEn = "İngilizce metin gerekli.";
  } else if (announcement.textEn.length > announcementValidationRules.textMaxChars) {
    fieldErrors.textEn = "İngilizce metin en fazla 140 karakter olabilir.";
  }

  if (!announcement.textTr.trim()) {
    fieldErrors.textTr = "Türkçe metin gerekli.";
  } else if (announcement.textTr.length > announcementValidationRules.textMaxChars) {
    fieldErrors.textTr = "Türkçe metin en fazla 140 karakter olabilir.";
  }

  if (announcement.expiresOn && !isValidDateInput(announcement.expiresOn)) {
    fieldErrors.expiresOn = "Bitiş tarihi geçerli bir tarih olmalıdır.";
  }

  return buildValidationResult(fieldErrors);
}

export function validateDailyContent(
  content: DailyContentValidationInput,
): ValidationResult<"arabic" | "translationEn" | "translationTr" | "source" | "type"> {
  const fieldErrors: ValidationResult<
    "arabic" | "translationEn" | "translationTr" | "source" | "type"
  >["fieldErrors"] = {};

  if (content.arabic.length > dailyContentValidationRules.arabicMaxChars) {
    fieldErrors.arabic = "Arapça metin TV ekranı için çok uzun (en fazla 180 karakter).";
  }

  if (content.translationEn.length > dailyContentValidationRules.translationMaxChars) {
    fieldErrors.translationEn =
      "İngilizce çeviri TV ekranı için çok uzun (en fazla 220 karakter).";
  }

  if (content.translationTr.length > dailyContentValidationRules.translationMaxChars) {
    fieldErrors.translationTr =
      "Türkçe çeviri TV ekranı için çok uzun (en fazla 220 karakter).";
  }

  if (!content.source.trim()) {
    fieldErrors.source = "Kaynak gerekli.";
  }

  if (content.type !== "ayah" && content.type !== "hadith") {
    fieldErrors.type = "Tür ayet veya hadis olmalıdır.";
  }

  return buildValidationResult(fieldErrors);
}

interface TickerValidationInput {
  textEn: string;
  textTr: string;
  type: TickerType | string;
}

export function validateTicker(
  ticker: TickerValidationInput,
): ValidationResult<"textEn" | "textTr" | "type"> {
  const fieldErrors: ValidationResult<"textEn" | "textTr" | "type">["fieldErrors"] = {};

  const hasEn = ticker.textEn.trim().length > 0;
  const hasTr = ticker.textTr.trim().length > 0;

  if (!hasEn && !hasTr) {
    fieldErrors.textEn = "En az bir dilde metin gerekli.";
    fieldErrors.textTr = "En az bir dilde metin gerekli.";
  }

  if (ticker.textEn.length > tickerValidationRules.textMaxChars) {
    fieldErrors.textEn = "İngilizce metin en fazla 120 karakter olabilir.";
  }

  if (ticker.textTr.length > tickerValidationRules.textMaxChars) {
    fieldErrors.textTr = "Türkçe metin en fazla 120 karakter olabilir.";
  }

  if (ticker.type !== "hadith" && ticker.type !== "message") {
    fieldErrors.type = "Tür hadis veya mesaj olmalıdır.";
  }

  return buildValidationResult(fieldErrors);
}
