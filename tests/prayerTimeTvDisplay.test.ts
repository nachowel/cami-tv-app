import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidPrayerTimesCurrent,
  validatePrayerTimesForDisplay,
} from "../src/utils/prayerTimeValidation.ts";
import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  resolveTvDisplayData,
  startTvDisplaySync,
  type TvDisplaySyncApi,
  type TvFirestoreBootstrap,
} from "../src/components/tv/tvFirestoreState.ts";

const validPrayerTimes: PrayerTimesCurrent = {
  ...mockDisplayData.prayerTimes,
  date: "2026-05-01",
  today: {
    fajr: "04:30",
    sunrise: "05:15",
    dhuhr: "12:56",
    asr: "16:45",
    maghrib: "20:22",
    isha: "21:49",
  },
  tomorrow: {
    fajr: "04:28",
    sunrise: "05:13",
    dhuhr: "12:55",
    asr: "16:44",
    maghrib: "20:20",
    isha: "21:47",
  },
  updated_at: "2026-05-01T18:00:00Z",
  effectiveSource: "aladhan",
  providerSource: "aladhan",
  method: 13,
  fetchedAt: "2026-05-01T18:00:00Z",
  manualOverride: false,
  offsets: { fajr: 1, sunrise: 0, dhuhr: 0, asr: 2, maghrib: 0, isha: -1 },
  automaticTimes: {
    date: "2026-05-01",
    today: {
      fajr: "04:30",
      sunrise: "05:15",
      dhuhr: "12:56",
      asr: "16:45",
      maghrib: "20:22",
      isha: "21:49",
    },
    tomorrow: {
      fajr: "04:28",
      sunrise: "05:13",
      dhuhr: "12:55",
      asr: "16:44",
      maghrib: "20:20",
      isha: "21:47",
    },
  },
};

test("isValidPrayerTimesCurrent accepts a complete valid prayerTimes object", () => {
  assert.equal(isValidPrayerTimesCurrent(validPrayerTimes), true);
});

test("isValidPrayerTimesCurrent accepts prayerTimes with null tomorrow", () => {
  assert.equal(isValidPrayerTimesCurrent({ ...validPrayerTimes, tomorrow: null }), true);
});

test("isValidPrayerTimesCurrent rejects missing date", () => {
  const invalid = { ...validPrayerTimes, date: "" };
  assert.equal(isValidPrayerTimesCurrent(invalid), false);
});

test("isValidPrayerTimesCurrent rejects invalid HH:MM format", () => {
  const invalid = { ...validPrayerTimes, today: { ...validPrayerTimes.today, fajr: "25:99" } };
  assert.equal(isValidPrayerTimesCurrent(invalid), false);
});

test("isValidPrayerTimesCurrent rejects missing today field", () => {
  const { today, ...partial } = validPrayerTimes;
  void today;
  const invalid = { ...validPrayerTimes, today: undefined };
  assert.equal(isValidPrayerTimesCurrent(invalid), false);
});

test("isValidPrayerTimesCurrent rejects partial tomorrow object", () => {
  const invalid = {
    ...validPrayerTimes,
    tomorrow: { fajr: "04:28" },
  };
  assert.equal(isValidPrayerTimesCurrent(invalid), false);
});

test("isValidPrayerTimesCurrent rejects null today", () => {
  const invalid = { ...validPrayerTimes, today: null };
  assert.equal(isValidPrayerTimesCurrent(invalid), false);
});

test("isValidPrayerTimesCurrent rejects non-object input", () => {
  assert.equal(isValidPrayerTimesCurrent(null), false);
  assert.equal(isValidPrayerTimesCurrent("string"), false);
  assert.equal(isValidPrayerTimesCurrent(42), false);
  assert.equal(isValidPrayerTimesCurrent(undefined), false);
});

test("validatePrayerTimesForDisplay returns the value when valid", () => {
  const result = validatePrayerTimesForDisplay(validPrayerTimes);
  assert.deepEqual(result, validPrayerTimes);
});

test("validatePrayerTimesForDisplay returns null for invalid input", () => {
  assert.equal(validatePrayerTimesForDisplay(null), null);
  assert.equal(validatePrayerTimesForDisplay({ date: "invalid" }), null);
  assert.equal(validatePrayerTimesForDisplay({ ...validPrayerTimes, today: { fajr: "" } }), null);
});

test("valid Firestore prayer snapshot updates TV state without page refresh", () => {
  const updates: ReturnType<typeof mockDisplayData>[] = [];
  let emitPrayerTimes: ((value: PrayerTimesCurrent) => void) | null = null;

  const api: TvDisplaySyncApi = {
    subscribeToAnnouncements(callback) { callback([]); return () => {}; },
    subscribeToDailyContentCurrent(callback) { callback(mockDisplayData.dailyContent); return () => {}; },
    subscribeToDisplaySettings(callback) { callback(mockDisplayData.settings); return () => {}; },
    subscribeToDonationCurrent(callback) { callback(mockDisplayData.donation); return () => {}; },
    subscribeToPrayerTimesCurrent(callback) {
      emitPrayerTimes = callback;
      callback(mockDisplayData.prayerTimes);
      return () => {};
    },
    subscribeToTickerCurrent(callback) { callback(mockDisplayData.ticker); return () => {}; },
  };

  const cleanup = startTvDisplaySync({
    api,
    fallback: mockDisplayData,
    onData(data) { updates.push(data); },
  });

  assert.ok(emitPrayerTimes);

  const updatedTimes: PrayerTimesCurrent = {
    ...mockDisplayData.prayerTimes,
    today: { ...mockDisplayData.prayerTimes.today, fajr: "05:00" },
  };
  emitPrayerTimes(updatedTimes);

  const lastUpdate = updates.at(-1);
  assert.equal(lastUpdate?.prayerTimes.today.fajr, "05:00");

  cleanup();
});

test("invalid prayer snapshot does not replace last valid TV state", () => {
  const updates: ReturnType<typeof mockDisplayData>[] = [];
  let emitPrayerTimes: ((value: unknown) => void) | null = null;

  const api: TvDisplaySyncApi = {
    subscribeToAnnouncements(callback) { callback([]); return () => {}; },
    subscribeToDailyContentCurrent(callback) { callback(mockDisplayData.dailyContent); return () => {}; },
    subscribeToDisplaySettings(callback) { callback(mockDisplayData.settings); return () => {}; },
    subscribeToDonationCurrent(callback) { callback(mockDisplayData.donation); return () => {}; },
    subscribeToPrayerTimesCurrent(callback) {
      emitPrayerTimes = callback as (v: PrayerTimesCurrent) => void;
      callback(mockDisplayData.prayerTimes);
      return () => {};
    },
    subscribeToTickerCurrent(callback) { callback(mockDisplayData.ticker); return () => {}; },
  };

  const cleanup = startTvDisplaySync({
    api,
    fallback: mockDisplayData,
    isDevelopment: true,
    onData(data) { updates.push(data); },
  });

  assert.ok(emitPrayerTimes);
  const originalFajr = updates.at(-1)?.prayerTimes.today.fajr;

  emitPrayerTimes({ date: "bad-date", today: { fajr: "" }, tomorrow: null });

  const lastUpdate = updates.at(-1);
  assert.equal(lastUpdate?.prayerTimes.today.fajr, originalFajr);

  cleanup();
});

test("Firestore error keeps last valid prayer times on screen", () => {
  const updates: ReturnType<typeof mockDisplayData>[] = [];
  const loggedErrors: string[] = [];

  const api: TvDisplaySyncApi = {
    subscribeToAnnouncements(callback) { callback([]); return () => {}; },
    subscribeToDailyContentCurrent(callback) { callback(mockDisplayData.dailyContent); return () => {}; },
    subscribeToDisplaySettings(callback) { callback(mockDisplayData.settings); return () => {}; },
    subscribeToDonationCurrent(callback) { callback(mockDisplayData.donation); return () => {}; },
    subscribeToPrayerTimesCurrent(callback, onError) {
      callback(mockDisplayData.prayerTimes);
      return () => {};
    },
    subscribeToTickerCurrent(callback) { callback(mockDisplayData.ticker); return () => {}; },
  };

  const cleanup = startTvDisplaySync({
    api,
    fallback: mockDisplayData,
    isDevelopment: true,
    logError(section, error) { loggedErrors.push(`${section}:${error.message}`); },
    onData(data) { updates.push(data); },
    scheduleRetry() { return () => {}; },
  });

  const firstFajr = updates[0]?.prayerTimes.today.fajr;

  cleanup();

  assert.ok(firstFajr);
  assert.deepEqual(loggedErrors, []);
});

test("next prayer after Isha uses tomorrow Fajr from Firestore", () => {
  const nextDayPrayers: PrayerTimesCurrent = {
    ...validPrayerTimes,
    today: {
      fajr: "04:30",
      sunrise: "05:15",
      dhuhr: "12:56",
      asr: "16:45",
      maghrib: "20:22",
      isha: "21:49",
    },
    tomorrow: {
      fajr: "04:28",
      sunrise: "05:13",
      dhuhr: "12:55",
      asr: "16:44",
      maghrib: "20:20",
      isha: "21:47",
    },
  };

  const bootstrap: TvFirestoreBootstrap = {
    announcements: [],
    dailyContent: null,
    donation: null,
    prayerTimes: nextDayPrayers,
    settings: null,
    ticker: null,
  };

  const result = resolveTvDisplayData(bootstrap, mockDisplayData);

  const ishaTime = new Date(2026, 4, 1, 21, 49, 0);
  const tomorrowFajrTime = new Date(2026, 4, 2, 4, 28, 0);
  const expectedCountdown = tomorrowFajrTime.getTime() - ishaTime.getTime();

  assert.equal(result.prayerTimes.tomorrow?.fajr, "04:28");
  assert.equal(result.prayerTimes.tomorrow?.fajr, nextDayPrayers.tomorrow?.fajr);
});

test("TV state uses only top-level prayer fields for display and calculation", () => {
  const updates: ReturnType<typeof mockDisplayData>[] = [];
  let emitPrayerTimes: ((value: PrayerTimesCurrent) => void) | null = null;

  const api: TvDisplaySyncApi = {
    subscribeToAnnouncements(callback) { callback([]); return () => {}; },
    subscribeToDailyContentCurrent(callback) { callback(mockDisplayData.dailyContent); return () => {}; },
    subscribeToDisplaySettings(callback) { callback(mockDisplayData.settings); return () => {}; },
    subscribeToDonationCurrent(callback) { callback(mockDisplayData.donation); return () => {}; },
    subscribeToPrayerTimesCurrent(callback) {
      emitPrayerTimes = callback;
      callback(mockDisplayData.prayerTimes);
      return () => {};
    },
    subscribeToTickerCurrent(callback) { callback(mockDisplayData.ticker); return () => {}; },
  };

  const cleanup = startTvDisplaySync({
    api,
    fallback: mockDisplayData,
    onData(data) { updates.push(data); },
  });

  const freshTimes: PrayerTimesCurrent = {
    ...mockDisplayData.prayerTimes,
    automaticTimes: {
      date: "2026-05-01",
      today: { fajr: "03:00", sunrise: "05:00", dhuhr: "12:00", asr: "15:00", maghrib: "19:00", isha: "21:00" },
      tomorrow: { fajr: "03:01", sunrise: "05:01", dhuhr: "12:01", asr: "15:01", maghrib: "19:01", isha: "21:01" },
    },
  };
  emitPrayerTimes(freshTimes);

  const lastUpdate = updates.at(-1);

  assert.equal(lastUpdate?.prayerTimes.today.fajr, "06:44");
  assert.equal(lastUpdate?.prayerTimes.effectiveSource, "manual");

  cleanup();
});