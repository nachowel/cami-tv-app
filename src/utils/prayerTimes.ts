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

function getStartOfDay(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function createPrayerEntry(date: Date, name: PrayerDisplayName, time: Time24Hour): PrayerScheduleEntry {
  return {
    name,
    time,
    dateTime: parsePrayerTime(date, time),
    isPrayer: name !== "sunrise",
  };
}

function getPrayerEntriesForDate(date: Date, prayerTimes: PrayerTimesForDay) {
  return prayerOrder.map((name) => createPrayerEntry(date, name, prayerTimes[name])) as Array<
    PrayerScheduleEntry & { name: PrayerName }
  >;
}

export function parsePrayerTime(date: Date, timeString: Time24Hour) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const parsed = new Date(date);

  parsed.setHours(hours, minutes, 0, 0);

  return parsed;
}

export function getPrayerScheduleForDate(date: Date, prayerTimes: PrayerTimesForDay) {
  return displayOrder.map((name) => createPrayerEntry(date, name, prayerTimes[name]));
}

export function getCurrentAndNextPrayer(now: Date, prayerTimes: PrayerTimesCurrent): PrayerMoment {
  const today = getStartOfDay(now);
  const todaysPrayers = getPrayerEntriesForDate(today, prayerTimes.today);
  const passedPrayers = todaysPrayers.filter((entry) => entry.dateTime <= now);
  const currentPrayer = passedPrayers.at(-1) ?? null;
  const nextPrayerToday = todaysPrayers.find((entry) => entry.dateTime > now);

  if (nextPrayerToday) {
    return {
      currentPrayer,
      nextPrayer: nextPrayerToday,
      countdownMs: Math.max(0, nextPrayerToday.dateTime.getTime() - now.getTime()),
    };
  }

  const tomorrow = addDays(today, 1);
  const tomorrowFajr = prayerTimes.tomorrow?.fajr ?? prayerTimes.today.fajr;
  const nextPrayer = createPrayerEntry(tomorrow, "fajr", tomorrowFajr) as PrayerScheduleEntry & {
    name: PrayerName;
  };

  return {
    currentPrayer,
    nextPrayer,
    countdownMs: Math.max(0, nextPrayer.dateTime.getTime() - now.getTime()),
  };
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");

  if (hours > 0) {
    return `${padded(hours)} hr ${padded(minutes)} min ${padded(seconds)} sec`;
  }

  return `${padded(minutes)} min ${padded(seconds)} sec`;
}
