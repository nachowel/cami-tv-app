import type { IsoDate, PrayerTimesCurrent, PrayerTimesForDay, Time24Hour } from "../../src/types/display.ts";

export interface AwqatPrayerTimeDayInput {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  gregorianDateLongIso8601: string;
}

export interface MapAwqatToPrayerTimesDocumentInput {
  current: PrayerTimesCurrent;
  today: AwqatPrayerTimeDayInput;
  fetchedAt: string;
}

function isValidTime24Hour(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function toTime24Hour(value: string, field: keyof PrayerTimesForDay): Time24Hour {
  if (!isValidTime24Hour(value)) {
    throw new Error(`Awqat prayer time field ${field} must use HH:MM format.`);
  }

  return value as Time24Hour;
}

function normalizeAwqatPrayerTimesForDay(value: AwqatPrayerTimeDayInput): PrayerTimesForDay {
  return {
    fajr: toTime24Hour(value.fajr, "fajr"),
    sunrise: toTime24Hour(value.sunrise, "sunrise"),
    dhuhr: toTime24Hour(value.dhuhr, "dhuhr"),
    asr: toTime24Hour(value.asr, "asr"),
    maghrib: toTime24Hour(value.maghrib, "maghrib"),
    isha: toTime24Hour(value.isha, "isha"),
  };
}

function normalizeAwqatGregorianDate(value: string): IsoDate {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Awqat gregorianDateLongIso8601 must be a valid ISO datetime.");
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);

  if (!match) {
    throw new Error("Awqat gregorianDateLongIso8601 must include a calendar date.");
  }

  return `${match[1]}-${match[2]}-${match[3]}` as IsoDate;
}

function normalizeAwqatAutomaticSnapshot(today: AwqatPrayerTimeDayInput) {
  return {
    date: normalizeAwqatGregorianDate(today.gregorianDateLongIso8601),
    today: normalizeAwqatPrayerTimesForDay(today),
    tomorrow: null,
  };
}

export function mapAwqatToPrayerTimesDocument({
  current,
  today,
  fetchedAt,
}: MapAwqatToPrayerTimesDocumentInput): PrayerTimesCurrent {
  const automaticTimes = normalizeAwqatAutomaticSnapshot(today);

  const nextValue: PrayerTimesCurrent = {
    ...current,
    providerSource: "awqat-salah",
    method: null,
    fetchedAt,
    offsets: current.offsets,
    automaticTimes,
  };

  if (current.manualOverride) {
    return {
      ...nextValue,
      effectiveSource: "manual",
      manualOverride: true,
    };
  }

  return {
    ...nextValue,
    date: automaticTimes.date,
    today: automaticTimes.today,
    tomorrow: null,
    updated_at: fetchedAt,
    effectiveSource: "awqat-salah",
    manualOverride: false,
  };
}
