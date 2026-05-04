import test from "node:test";
import assert from "node:assert/strict";

import type { PrayerTimesCurrent } from "../src/types/display.ts";
import {
  formatCountdown,
  getCurrentAndNextPrayer,
  getPrayerScheduleForDate,
  parsePrayerTime,
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
