import type { PrayerTimesCurrent, PrayerTimesForDay, Time24Hour } from "../types/display";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidTime24(value: unknown): value is Time24Hour {
  return typeof value === "string" && HHMM_REGEX.test(value);
}

function isValidIsoDate(value: unknown): boolean {
  return typeof value === "string" && ISO_DATE_REGEX.test(value);
}

function isValidPrayerTimesForDay(value: unknown): value is PrayerTimesForDay {
  if (!value || typeof value !== "object") {
    return false;
  }

  const requiredKeys: Array<keyof PrayerTimesForDay> = [
    "fajr",
    "sunrise",
    "dhuhr",
    "asr",
    "maghrib",
    "isha",
  ];

  return requiredKeys.every((key) => key in value && isValidTime24((value as Record<string, unknown>)[key]));
}

export function isValidPrayerTimesCurrent(value: unknown): value is PrayerTimesCurrent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (!isValidIsoDate(obj.date)) {
    return false;
  }

  if (!isValidPrayerTimesForDay(obj.today)) {
    return false;
  }

  if (obj.tomorrow !== null) {
    const tomorrow = obj.tomorrow;

    if (typeof tomorrow !== "object" || tomorrow === null) {
      return false;
    }

    const requiredTomorrowKeys: Array<keyof PrayerTimesForDay> = [
      "fajr",
      "sunrise",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ];

    if (!requiredTomorrowKeys.every((key) => key in tomorrow && isValidTime24((tomorrow as Record<string, unknown>)[key]))) {
      return false;
    }
  }

  return true;
}

export function validatePrayerTimesForDisplay(value: unknown): PrayerTimesCurrent | null {
  return isValidPrayerTimesCurrent(value) ? value : null;
}