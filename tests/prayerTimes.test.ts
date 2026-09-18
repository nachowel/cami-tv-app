import test from "node:test";
import assert from "node:assert/strict";

import type { PrayerTimesCurrent } from "../src/types/display.ts";
import {
  formatCountdown,
  getCurrentAndNextPrayer,
  getPrayerMomentForLondonDate,
  getPrayerScheduleForDate,
  parsePrayerTime,
  resolvePrayerTimesForLondonDate,
} from "../src/utils/prayerTimes.ts";

const basePrayerTimes: PrayerTimesCurrent = {
  date: "2026-05-01",
  today: {
    fajr: "06:44",
    sunrise: "08:44",
    dhuhr: "12:47",
    asr: "14:22",
    maghrib: "16:41",
    isha: "18:27",
  },
  tomorrow: null,
  updated_at: "2026-05-01T18:00:00Z",
};

test("parsePrayerTime applies a local HH:MM time to the provided date", () => {
  const parsed = parsePrayerTime(new Date(2026, 4, 1, 0, 0, 0), "14:22");

  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 4);
  assert.equal(parsed.getDate(), 1);
  assert.equal(parsed.getHours(), 14);
  assert.equal(parsed.getMinutes(), 22);
  assert.equal(parsed.getSeconds(), 0);
});

test("getPrayerScheduleForDate returns all display events in timetable order", () => {
  const schedule = getPrayerScheduleForDate(new Date(2026, 4, 1, 0, 0, 0), basePrayerTimes.today);

  assert.deepEqual(
    schedule.map((entry) => entry.name),
    ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"],
  );
  assert.equal(schedule[1]?.isPrayer, false);
  assert.equal(schedule[4]?.dateTime.getHours(), 16);
  assert.equal(schedule[4]?.dateTime.getMinutes(), 41);
});

test("before Fajr the next prayer is Fajr and there is no current prayer", () => {
  const result = getCurrentAndNextPrayer(new Date(2026, 4, 1, 5, 30, 0), basePrayerTimes);

  assert.equal(result.currentPrayer, null);
  assert.equal(result.nextPrayer.name, "fajr");
  assert.equal(result.countdownMs, 74 * 60 * 1000);
});

test("between prayers the current prayer is the latest passed prayer and sunrise is skipped", () => {
  const result = getCurrentAndNextPrayer(new Date(2026, 4, 1, 9, 0, 0), basePrayerTimes);

  assert.equal(result.currentPrayer?.name, "fajr");
  assert.equal(result.nextPrayer.name, "dhuhr");
  assert.equal(result.countdownMs, ((3 * 60) + 47) * 60 * 1000);
});

test("during Asr the current prayer remains Asr while the next prayer is Maghrib", () => {
  const result = getCurrentAndNextPrayer(new Date(2026, 4, 1, 15, 0, 0), basePrayerTimes);

  assert.equal(result.currentPrayer?.name, "asr");
  assert.equal(result.nextPrayer.name, "maghrib");
});

test("at Maghrib time the current prayer becomes Maghrib", () => {
  const result = getCurrentAndNextPrayer(new Date(2026, 4, 1, 16, 41, 0), basePrayerTimes);

  assert.equal(result.currentPrayer?.name, "maghrib");
  assert.equal(result.nextPrayer.name, "isha");
});

test("after Isha the next prayer falls back to the next day's Fajr when tomorrow is unavailable", () => {
  const result = getCurrentAndNextPrayer(new Date(2026, 4, 1, 20, 0, 0), basePrayerTimes);

  assert.equal(result.currentPrayer?.name, "isha");
  assert.equal(result.nextPrayer.name, "fajr");
  assert.equal(result.nextPrayer.dateTime.getDate(), 2);
  assert.equal(result.nextPrayer.dateTime.getHours(), 6);
  assert.equal(result.nextPrayer.dateTime.getMinutes(), 44);
});

test("after Isha the next prayer uses tomorrow's Fajr when tomorrow data exists", () => {
  const result = getCurrentAndNextPrayer(new Date(2026, 4, 1, 20, 0, 0), {
    ...basePrayerTimes,
    tomorrow: {
      ...basePrayerTimes.today,
      fajr: "06:38",
    },
  });

  assert.equal(result.currentPrayer?.name, "isha");
  assert.equal(result.nextPrayer.name, "fajr");
  assert.equal(result.nextPrayer.dateTime.getDate(), 2);
  assert.equal(result.nextPrayer.dateTime.getHours(), 6);
  assert.equal(result.nextPrayer.dateTime.getMinutes(), 38);
});

test("formatCountdown returns zero-padded countdown text", () => {
  assert.equal(formatCountdown(486_000), "00:08:06");
  assert.equal(formatCountdown(((2 * 60 * 60) + (3 * 60) + 4) * 1000), "02:03:04");
  assert.equal(formatCountdown(-500), "00:00:00");
});

const septemberPrayerTimes: PrayerTimesCurrent = {
  ...basePrayerTimes,
  date: "2026-09-18",
  today: {
    fajr: "04:44",
    sunrise: "06:33",
    dhuhr: "13:00",
    asr: "16:23",
    maghrib: "19:17",
    isha: "20:51",
  },
  tomorrow: {
    fajr: "04:46",
    sunrise: "06:34",
    dhuhr: "12:59",
    asr: "16:21",
    maghrib: "19:15",
    isha: "20:48",
  },
};

test("23:59 Europe/London accepts prayer data for the current Gregorian day", () => {
  const resolved = resolvePrayerTimesForLondonDate(
    new Date("2026-09-18T22:59:00.000Z"),
    septemberPrayerTimes,
  );

  assert.equal(resolved?.date, "2026-09-18");
  assert.deepEqual(resolved?.today, septemberPrayerTimes.today);
  assert.deepEqual(resolved?.tomorrow, septemberPrayerTimes.tomorrow);
});

test("00:01 Europe/London temporarily promotes a valid previous snapshot tomorrow", () => {
  const resolved = resolvePrayerTimesForLondonDate(
    new Date("2026-09-18T23:01:00.000Z"),
    septemberPrayerTimes,
  );

  assert.equal(resolved?.date, "2026-09-19");
  assert.deepEqual(resolved?.today, septemberPrayerTimes.tomorrow);
  assert.equal(resolved?.tomorrow, null);
});

test("00:01 Europe/London rejects an older snapshot instead of promoting unrelated tomorrow data", () => {
  const resolved = resolvePrayerTimesForLondonDate(
    new Date("2026-09-18T23:01:00.000Z"),
    {
      ...septemberPrayerTimes,
      date: "2026-09-17",
    },
  );

  assert.equal(resolved, null);
});

test("stale prayer data produces no next prayer or countdown", () => {
  const result = getPrayerMomentForLondonDate(
    new Date("2026-09-18T12:00:00.000Z"),
    {
      ...septemberPrayerTimes,
      date: "2026-07-19",
    },
  );

  assert.equal(result, null);
});

test("midnight rollover remains valid on the GMT to BST transition date", () => {
  const resolved = resolvePrayerTimesForLondonDate(
    new Date("2026-03-29T00:01:00.000Z"),
    {
      ...septemberPrayerTimes,
      date: "2026-03-28",
    },
  );

  assert.equal(resolved?.date, "2026-03-29");
  assert.deepEqual(resolved?.today, septemberPrayerTimes.tomorrow);
});

test("midnight rollover remains valid on the BST to GMT transition date", () => {
  const resolved = resolvePrayerTimesForLondonDate(
    new Date("2026-10-24T23:01:00.000Z"),
    {
      ...septemberPrayerTimes,
      date: "2026-10-24",
    },
  );

  assert.equal(resolved?.date, "2026-10-25");
  assert.deepEqual(resolved?.today, septemberPrayerTimes.tomorrow);
});

test("next Fajr uses the BST offset after the GMT to BST transition", () => {
  const result = getCurrentAndNextPrayer(
    new Date("2026-03-28T23:30:00.000Z"),
    {
      ...septemberPrayerTimes,
      date: "2026-03-28",
      today: { ...septemberPrayerTimes.today, isha: "20:00" },
      tomorrow: { ...septemberPrayerTimes.tomorrow, fajr: "04:30" },
    },
  );

  assert.equal(result.nextPrayer.dateTime.toISOString(), "2026-03-29T03:30:00.000Z");
});

test("same-day Fajr uses the GMT offset after the BST to GMT transition", () => {
  const schedule = getPrayerScheduleForDate(
    new Date("2026-10-25T12:00:00.000Z"),
    { ...septemberPrayerTimes.today, fajr: "05:30" },
  );

  assert.equal(schedule[0]?.dateTime.toISOString(), "2026-10-25T05:30:00.000Z");
});
