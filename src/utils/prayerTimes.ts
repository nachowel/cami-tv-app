import type { PrayerTimesCurrent, PrayerTimesForDay, Time24Hour } from "../types/display";

export type PrayerDisplayName = keyof PrayerTimesForDay;
export type PrayerName = Exclude<PrayerDisplayName, "sunrise">;

export interface PrayerScheduleEntry {
  name: PrayerDisplayName;
  time: Time24Hour;
  dateTime: Date;
  isPrayer: boolean;
}

export interface PrayerMoment {
  currentPrayer: PrayerScheduleEntry | null;
  nextPrayer: PrayerScheduleEntry & { name: PrayerName };
  countdownMs: number;
}

const displayOrder: PrayerDisplayName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const prayerOrder: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/**
 * Get the London date components from a Date object.
 * Uses Intl.DateTimeFormat to extract the actual London date parts,
 * which handles BST/GMT transitions correctly.
 */
function getLondonDateParts(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);

  return { year, month, day };
}

/**
 * Get the London hour and minute from a Date object.
 */
function getLondonTimeParts(date: Date): { hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  const second = Number(parts.find((p) => p.type === "second")!.value);

  return { hour, minute, second };
}

/**
 * Convert a London date + HH:MM time string into a UTC-based Date object
 * that represents that exact London moment. This is the core function that
 * ensures prayer time comparisons work correctly regardless of the browser's
 * local timezone.
 */
function londonTimeToDate(londonDate: { year: number; month: number; day: number }, timeString: Time24Hour): Date {
  const [hours, minutes] = timeString.split(":").map(Number);

  // Build an ISO string targeting the London date/time, then use the
  // Intl API to find the correct UTC offset for that moment.
  // We construct a Date in UTC first, then adjust for the London offset.
  const tentativeUtc = new Date(
    Date.UTC(londonDate.year, londonDate.month - 1, londonDate.day, hours, minutes, 0, 0)
  );

  // Find the London offset at this approximate time.
  // The offset is: londonLocal - UTC. We can derive it by comparing
  // the London-formatted hour with the UTC hour.
  const londonParts = getLondonTimeParts(tentativeUtc);
  const offsetHours = londonParts.hour - tentativeUtc.getUTCHours();
  // Normalize to handle day boundary wrap (e.g. UTC 23:00 = London 00:00 BST)
  const normalizedOffset = ((offsetHours + 24) % 24);
  const actualOffset = normalizedOffset > 12 ? normalizedOffset - 24 : normalizedOffset;

  // The prayer time in UTC = london time - offset
  const utcMs = Date.UTC(
    londonDate.year,
    londonDate.month - 1,
    londonDate.day,
    hours - actualOffset,
    minutes,
    0,
    0
  );

  return new Date(utcMs);
}

function createPrayerEntry(
  londonDate: { year: number; month: number; day: number },
  name: PrayerDisplayName,
  time: Time24Hour,
): PrayerScheduleEntry {
  return {
    name,
    time,
    dateTime: londonTimeToDate(londonDate, time),
    isPrayer: name !== "sunrise",
  };
}

function getPrayerEntriesForDate(
  londonDate: { year: number; month: number; day: number },
  prayerTimes: PrayerTimesForDay,
) {
  return prayerOrder.map((name) => createPrayerEntry(londonDate, name, prayerTimes[name])) as Array<
    PrayerScheduleEntry & { name: PrayerName }
  >;
}

/**
 * @deprecated Use londonTimeToDate instead for timezone-safe parsing.
 * Kept for backward compatibility with any external callers.
 */
export function parsePrayerTime(date: Date, timeString: Time24Hour) {
  const londonDate = getLondonDateParts(date);
  return londonTimeToDate(londonDate, timeString);
}

export function getPrayerScheduleForDate(date: Date, prayerTimes: PrayerTimesForDay) {
  const londonDate = getLondonDateParts(date);
  return displayOrder.map((name) => createPrayerEntry(londonDate, name, prayerTimes[name]));
}

/**
 * Determine the current and next prayer based on the current time.
 * All comparisons use absolute UTC timestamps derived from London times,
 * so this works correctly regardless of the browser's local timezone.
 */
export function getCurrentAndNextPrayer(now: Date, prayerTimes: PrayerTimesCurrent): PrayerMoment {
  const londonToday = getLondonDateParts(now);
  const todaysPrayers = getPrayerEntriesForDate(londonToday, prayerTimes.today);

  // Floor `now` to the start of the current second so the countdown seconds
  // are always consistent with the displayed clock time (which also floors).
  const nowMs = now.getTime();
  const nowFlooredMs = nowMs - (nowMs % 1000);

  const passedPrayers = todaysPrayers.filter((entry) => entry.dateTime.getTime() <= nowFlooredMs);
  const currentPrayer = passedPrayers.at(-1) ?? null;
  const nextPrayerToday = todaysPrayers.find((entry) => entry.dateTime.getTime() > nowFlooredMs);

  if (nextPrayerToday) {
    return {
      currentPrayer,
      nextPrayer: nextPrayerToday,
      countdownMs: Math.max(0, nextPrayerToday.dateTime.getTime() - nowFlooredMs),
    };
  }

  // After Isha — next prayer is tomorrow's Fajr
  const tomorrowDate = {
    ...londonToday,
    day: londonToday.day + 1,
  };
  // Handle month/year rollover: let Date.UTC normalize it
  const tomorrowFajrTime = prayerTimes.tomorrow?.fajr ?? prayerTimes.today.fajr;
  const nextPrayer = createPrayerEntry(tomorrowDate, "fajr", tomorrowFajrTime) as PrayerScheduleEntry & {
    name: PrayerName;
  };

  return {
    currentPrayer,
    nextPrayer,
    countdownMs: Math.max(0, nextPrayer.dateTime.getTime() - nowFlooredMs),
  };
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");
  return `${padded(hours)}:${padded(minutes)}:${padded(seconds)}`;
}
