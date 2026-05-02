import type { PrayerTimesCurrent } from "../../src/types/display.ts";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface PrayerTimesValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidTime24(value: unknown): value is string {
  return typeof value === "string" && HHMM_REGEX.test(value);
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function validatePrayerTimesCurrent(value: unknown): PrayerTimesValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== "object") {
    return { valid: false, errors: ["Prayer times object is missing or not an object."] };
  }

  const obj = value as Record<string, unknown>;

  const requiredTopLevelFields: Array<{ key: string; label: string }> = [
    { key: "date", label: "date" },
    { key: "today", label: "today" },
    { key: "updated_at", label: "updated_at" },
  ];

  for (const field of requiredTopLevelFields) {
    const val = obj[field.key];
    if (val === undefined || val === null) {
      errors.push(`Missing or empty top-level field: "${field.key}"`);
    } else if (typeof val === "string" && val.trim().length === 0) {
      errors.push(`Missing or empty top-level field: "${field.key}"`);
    }
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof obj.date !== "string") {
    errors.push(`date must be a non-empty string in YYYY-MM-DD format, got ${typeof obj.date}: ${String(obj.date)}`);
  } else if (!dateRegex.test(obj.date)) {
    errors.push(`date must be YYYY-MM-DD format, got: "${obj.date}"`);
  }

  const prayerFields: Array<{ key: string; label: string }> = [
    { key: "fajr", label: "Fajr" },
    { key: "sunrise", label: "Sunrise" },
    { key: "dhuhr", label: "Dhuhr" },
    { key: "asr", label: "Asr" },
    { key: "maghrib", label: "Maghrib" },
    { key: "isha", label: "Isha" },
  ];

  const today = obj.today as Record<string, unknown> | undefined;
  if (!today || typeof today !== "object") {
    errors.push("Missing or invalid today prayer times object.");
  } else {
    for (const field of prayerFields) {
      const val = today[field.key];
      if (val === undefined || val === null) {
        errors.push(`today.${field.key} is missing or null.`);
      } else if (!isValidTime24(val)) {
        errors.push(`today.${field.key} has invalid time format "${val}", expected HH:MM.`);
      }
    }
  }

  const tomorrow = obj.tomorrow as Record<string, unknown> | undefined;
  if (tomorrow !== null && tomorrow !== undefined) {
    if (typeof tomorrow !== "object") {
      errors.push("tomorrow must be an object or null.");
    } else {
      for (const field of prayerFields) {
        const val = tomorrow[field.key];
        if (val === undefined || val === null) {
          errors.push(`tomorrow.${field.key} is missing or null.`);
        } else if (!isValidTime24(val)) {
          errors.push(`tomorrow.${field.key} has invalid time format "${val}", expected HH:MM.`);
        }
      }

      const tomorrowTimes = tomorrow as Record<string, string>;
      const order: Array<{ key: keyof typeof tomorrowTimes; label: string }> = [
        { key: "fajr", label: "Fajr" },
        { key: "sunrise", label: "Sunrise" },
        { key: "dhuhr", label: "Dhuhr" },
        { key: "asr", label: "Asr" },
        { key: "maghrib", label: "Maghrib" },
        { key: "isha", label: "Isha" },
      ];

      for (let i = 0; i < order.length - 1; i++) {
        const current = tomorrowTimes[order[i].key];
        const next = tomorrowTimes[order[i + 1].key];
        if (isValidTime24(current) && isValidTime24(next)) {
          if (timeToMinutes(current) >= timeToMinutes(next)) {
            errors.push(
              `Logical order violation in tomorrow: ${order[i].label} (${current}) is not before ${order[i + 1].label} (${next}).`,
            );
          }
        }
      }
    }
  }

  if (today && typeof today === "object") {
    const todayTimes = today as Record<string, string>;
    const order: Array<{ key: keyof typeof todayTimes; label: string }> = [
      { key: "fajr", label: "Fajr" },
      { key: "sunrise", label: "Sunrise" },
      { key: "dhuhr", label: "Dhuhr" },
      { key: "asr", label: "Asr" },
      { key: "maghrib", label: "Maghrib" },
      { key: "isha", label: "Isha" },
    ];

    for (let i = 0; i < order.length - 1; i++) {
      const current = todayTimes[order[i].key];
      const next = todayTimes[order[i + 1].key];
      if (isValidTime24(current) && isValidTime24(next)) {
        if (timeToMinutes(current) >= timeToMinutes(next)) {
          errors.push(
            `Logical order violation in today: ${order[i].label} (${current}) is not before ${order[i + 1].label} (${next}).`,
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function describePrayerTimesForLog(
  prayerTimes: PrayerTimesCurrent,
  timezone: string,
  providerSource: string,
): string {
  const lines: string[] = [];
  lines.push(`[Prayer Times Sync Payload]`);
  lines.push(`  date: ${prayerTimes.date}`);
  lines.push(`  timezone: ${timezone}`);
  lines.push(`  source: ${providerSource}`);
  lines.push(`  updatedAt: ${prayerTimes.updated_at}`);
  lines.push(`  validationStatus: valid`);
  lines.push(`  today:`);
  lines.push(`    fajr: ${prayerTimes.today.fajr}`);
  lines.push(`    sunrise: ${prayerTimes.today.sunrise}`);
  lines.push(`    dhuhr: ${prayerTimes.today.dhuhr}`);
  lines.push(`    asr: ${prayerTimes.today.asr}`);
  lines.push(`    maghrib: ${prayerTimes.today.maghrib}`);
  lines.push(`    isha: ${prayerTimes.today.isha}`);
  if (prayerTimes.tomorrow) {
    lines.push(`  tomorrow:`);
    lines.push(`    fajr: ${prayerTimes.tomorrow.fajr}`);
    lines.push(`    sunrise: ${prayerTimes.tomorrow.sunrise}`);
    lines.push(`    dhuhr: ${prayerTimes.tomorrow.dhuhr}`);
    lines.push(`    asr: ${prayerTimes.tomorrow.asr}`);
    lines.push(`    maghrib: ${prayerTimes.tomorrow.maghrib}`);
    lines.push(`    isha: ${prayerTimes.tomorrow.isha}`);
  }
  return lines.join("\n");
}