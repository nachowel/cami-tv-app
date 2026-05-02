import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  applySuccessfulProviderSync,
  createPrayerTimeSyncRunner,
} from "../scripts/prayerTimes/prayerTimeSyncShared.ts";

const providerResult = {
  providerSource: "aladhan" as const,
  method: 13,
  fetchedAt: "2026-05-02T03:40:00.000Z",
  offsets: {
    fajr: 1,
    sunrise: 0,
    dhuhr: 0,
    asr: 2,
    maghrib: 0,
    isha: -1,
  },
  automaticTimes: {
    date: "2026-05-02" as const,
    today: {
      fajr: "04:32",
      sunrise: "05:17",
      dhuhr: "12:56",
      asr: "16:45",
      maghrib: "20:22",
      isha: "21:49",
    },
    tomorrow: {
      fajr: "04:30",
      sunrise: "05:15",
      dhuhr: "12:56",
      asr: "16:46",
      maghrib: "20:24",
      isha: "21:51",
    },
  },
};

test("applySuccessfulProviderSync writes effective fields when manualOverride is false", () => {
  const result = applySuccessfulProviderSync(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      offsets: {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      },
      automaticTimes: null,
    },
    providerResult,
  );

  assert.equal(result.effectiveSource, "aladhan");
  assert.equal(result.providerSource, "aladhan");
  assert.equal(result.date, "2026-05-02");
  assert.equal(result.today.fajr, "04:32");
  assert.equal(result.tomorrow?.maghrib, "20:24");
  assert.equal(result.updated_at, "2026-05-02T03:40:00.000Z");
  assert.deepEqual(result.automaticTimes, providerResult.automaticTimes);
  assert.deepEqual(result.offsets, providerResult.offsets);
});

test("applySuccessfulProviderSync preserves manual effective fields when manualOverride is true", () => {
  const result = applySuccessfulProviderSync(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      offsets: {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      },
      automaticTimes: null,
    },
    providerResult,
  );

  assert.equal(result.effectiveSource, "manual");
  assert.equal(result.date, mockDisplayData.prayerTimes.date);
  assert.equal(result.today.fajr, mockDisplayData.prayerTimes.today.fajr);
  assert.equal(result.updated_at, mockDisplayData.prayerTimes.updated_at);
  assert.equal(result.providerSource, "aladhan");
  assert.equal(result.method, 13);
  assert.equal(result.fetchedAt, "2026-05-02T03:40:00.000Z");
  assert.deepEqual(result.offsets, providerResult.offsets);
  assert.deepEqual(result.automaticTimes, providerResult.automaticTimes);
});

test("sync runner writes effective fields for legacy documents only after admin opts back into automatic mode", async () => {
  let savedValue: unknown = null;
  const runner = createPrayerTimeSyncRunner({
    fetchCurrent: async () => ({
      date: "2026-05-01",
      today: mockDisplayData.prayerTimes.today,
      tomorrow: null,
      updated_at: "2026-05-01T18:00:00Z",
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      method: null,
      fetchedAt: null,
      offsets: {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      },
      automaticTimes: null,
    }),
    fetchProviderResult: async () => providerResult,
    saveCurrent: async (value) => {
      savedValue = value;
    },
    logError() {},
  });

  const result = await runner.run();

  assert.equal(result.effectiveSource, "aladhan");
  assert.equal((savedValue as typeof result).today.fajr, "04:32");
});

test("sync runner respects legacy defaults and preserves effective fields when manualOverride is missing", async () => {
  let savedValue: unknown = null;
  const runner = createPrayerTimeSyncRunner({
    fetchCurrent: async () => ({
      date: "2026-05-01",
      today: mockDisplayData.prayerTimes.today,
      tomorrow: null,
      updated_at: "2026-05-01T18:00:00Z",
    }),
    fetchProviderResult: async () => providerResult,
    saveCurrent: async (value) => {
      savedValue = value;
    },
    logError() {},
  });

  const result = await runner.run();

  assert.equal(result.manualOverride, true);
  assert.equal(result.effectiveSource, "manual");
  assert.equal(result.today.fajr, mockDisplayData.prayerTimes.today.fajr);
  assert.deepEqual((savedValue as typeof result).automaticTimes, providerResult.automaticTimes);
});

test("sync runner performs zero writes and logs a clear error when provider fetch fails", async () => {
  let writeCalls = 0;
  const loggedErrors: string[] = [];
  const runner = createPrayerTimeSyncRunner({
    fetchCurrent: async () => mockDisplayData.prayerTimes,
    fetchProviderResult: async () => {
      throw new Error("aladhan-unavailable");
    },
    saveCurrent: async () => {
      writeCalls += 1;
    },
    logError(message, error) {
      loggedErrors.push(
        `${message}:${error instanceof Error ? error.message : String(error)}`,
      );
    },
  });

  await assert.rejects(() => runner.run(), /aladhan-unavailable/);
  assert.equal(writeCalls, 0);
  assert.deepEqual(loggedErrors, ["Aladhan prayer time sync failed.:aladhan-unavailable"]);
});

test("sync runner performs zero writes when provider result is missing tomorrow", async () => {
  let writeCalls = 0;
  const loggedErrors: string[] = [];
  const runner = createPrayerTimeSyncRunner({
    fetchCurrent: async () => mockDisplayData.prayerTimes,
    fetchProviderResult: async () => ({
      ...providerResult,
      automaticTimes: {
        ...providerResult.automaticTimes,
        tomorrow: null,
      },
    }),
    saveCurrent: async () => {
      writeCalls += 1;
    },
    logError(message, error) {
      loggedErrors.push(
        `${message}:${error instanceof Error ? error.message : String(error)}`,
      );
    },
  });

  await assert.rejects(() => runner.run(), /complete today and tomorrow prayer times/);
  assert.equal(writeCalls, 0);
  assert.deepEqual(loggedErrors, [
    "Aladhan prayer time sync failed.:Provider result must include complete today and tomorrow prayer times.",
  ]);
});

test("sync runner performs zero writes when provider result is missing today", async () => {
  let writeCalls = 0;
  const loggedErrors: string[] = [];
  const runner = createPrayerTimeSyncRunner({
    fetchCurrent: async () => mockDisplayData.prayerTimes,
    fetchProviderResult: async () => ({
      ...providerResult,
      automaticTimes: {
        ...providerResult.automaticTimes,
        today: null as never,
      },
    }),
    saveCurrent: async () => {
      writeCalls += 1;
    },
    logError(message, error) {
      loggedErrors.push(
        `${message}:${error instanceof Error ? error.message : String(error)}`,
      );
    },
  });

  await assert.rejects(() => runner.run(), /complete today and tomorrow prayer times/);
  assert.equal(writeCalls, 0);
  assert.deepEqual(loggedErrors, [
    "Aladhan prayer time sync failed.:Provider result must include complete today and tomorrow prayer times.",
  ]);
});

test("sync runner allows writes only when provider result contains both today and tomorrow", async () => {
  let writeCalls = 0;
  const runner = createPrayerTimeSyncRunner({
    fetchCurrent: async () => ({
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      offsets: {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      },
      automaticTimes: null,
    }),
    fetchProviderResult: async () => providerResult,
    saveCurrent: async () => {
      writeCalls += 1;
    },
    logError() {},
  });

  await runner.run();
  assert.equal(writeCalls, 1);
});
