import type { IsoDateTime, PrayerTimeSourceSetting, PrayerTimeSourceSettings } from "../types/display.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeUpdatedAt(value: unknown): IsoDateTime | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (isRecord(value) && typeof value.toDate === "function") {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

export function createDefaultPrayerTimeSourceSettings(): PrayerTimeSourceSettings {
  return {
    cityId: undefined,
    cityName: undefined,
    source: "manual",
    updatedAt: null,
    updatedBy: undefined,
  };
}

function normalizeSource(value: unknown): PrayerTimeSourceSetting {
  if (value === "aladhan") {
    return "aladhan";
  }

  if (value === "awqat" || value === "awqat-salah") {
    return "awqat-salah";
  }

  return "manual";
}

export function normalizePrayerTimeSourceSettings(value: unknown): PrayerTimeSourceSettings {
  if (!isRecord(value)) {
    return createDefaultPrayerTimeSourceSettings();
  }

  return {
    cityId: readString(value.cityId) || undefined,
    cityName: readString(value.cityName) || undefined,
    source: normalizeSource(value.source),
    updatedAt: normalizeUpdatedAt(value.updatedAt),
    updatedBy: readString(value.updatedBy) || undefined,
  };
}
