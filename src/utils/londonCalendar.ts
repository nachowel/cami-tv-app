import type { HijriDateOffset, IsoDate } from "../types/display.ts";

export const LONDON_TIME_ZONE = "Europe/London";

const hijriMonthNames = [
  "Muharram",
  "Safar",
  "Rebiulevvel",
  "Rebiulahir",
  "Cemaziyelevvel",
  "Cemaziyelahir",
  "Rajab",
  "Shaban",
  "Ramadan",
  "Shawwal",
  "Dhul Qadah",
  "Dhul Hijjah",
] as const;

const gregorianDateFormatters = new Map<string, Intl.DateTimeFormat>();
const hijriDateFormatter = new Intl.DateTimeFormat(
  "en-US-u-ca-islamic-umalqura-nu-latn",
  {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
    year: "numeric",
  },
);

function getGregorianDateFormatter(timeZone: string) {
  const cached = gregorianDateFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  gregorianDateFormatters.set(timeZone, formatter);
  return formatter;
}

function readNumericPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = Number(parts.find((part) => part.type === type)?.value);

  if (!Number.isInteger(value)) {
    throw new Error(`Unable to read ${type} from calendar date.`);
  }

  return value;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid ISO calendar date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ISO calendar date: ${value}`);
  }

  return { day, month, year };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function normalizeHijriDateOffset(value: unknown): HijriDateOffset {
  return value === -1 || value === 0 || value === 1 ? value : 0;
}

export function getIsoDateInTimeZone(date: Date, timeZone: string): IsoDate {
  const parts = getGregorianDateFormatter(timeZone).formatToParts(date);
  const year = readNumericPart(parts, "year");
  const month = readNumericPart(parts, "month");
  const day = readNumericPart(parts, "day");

  return `${year}-${pad(month)}-${pad(day)}` as IsoDate;
}

export function getLondonIsoDate(date: Date): IsoDate {
  return getIsoDateInTimeZone(date, LONDON_TIME_ZONE);
}

export function addIsoDateDays(value: string, days: number): IsoDate {
  const { day, month, year } = parseIsoDate(value);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` as IsoDate;
}

export function formatLondonHijriDate(date: Date, offsetValue: unknown = 0) {
  const londonIsoDate = getLondonIsoDate(date);
  const adjustedIsoDate = addIsoDateDays(londonIsoDate, normalizeHijriDateOffset(offsetValue));
  const { day, month, year } = parseIsoDate(adjustedIsoDate);
  const calendarDate = new Date(Date.UTC(year, month - 1, day, 12));
  const parts = hijriDateFormatter.formatToParts(calendarDate);
  const hijriDay = readNumericPart(parts, "day");
  const hijriMonth = readNumericPart(parts, "month");
  const hijriYear = readNumericPart(parts, "year");
  const monthName = hijriMonthNames[hijriMonth - 1];

  if (!monthName) {
    throw new Error(`Unsupported Hijri month: ${hijriMonth}`);
  }

  return `${hijriDay} ${monthName} ${hijriYear}`;
}
