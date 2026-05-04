import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  normalizePrayerTimesCurrent,
  restoreEffectivePrayerTimesFromAutomatic,
} from "../src/utils/prayerTimeDocument.ts";

test("normalizePrayerTimesCurrent protects legacy documents by default", () => {
  const result = normalizePrayerTimesCurrent({
    date: "2026-05-01",
    today: mockDisplayData.prayerTimes.today,
    tomorrow: null,
    updated_at: "2026-05-01T18:00:00Z",
  });

  assert.equal(result.manualOverride, true);
  assert.equal(result.effectiveSource, "manual");
  assert.equal(result.providerSource, null);
  assert.deepEqual(result.offsets, {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  });
  assert.equal(result.automaticTimes, null);
});

test("normalizePrayerTimesCurrent keeps existing aladhan documents compatible", () => {
  const result = normalizePrayerTimesCurrent({
    date: "2026-05-02",
    today: {
      fajr: "04:55",
      sunrise: "05:33",
      dhuhr: "12:58",
      asr: "16:42",
      maghrib: "20:18",
      isha: "21:41",
    },
    tomorrow: null,
    updated_at: "2026-05-02T19:00:00.000Z",
    effectiveSource: "aladhan",
    providerSource: "aladhan",
    method: 13,
    fetchedAt: "2026-05-02T18:55:00.000Z",
    manualOverride: false,
    offsets: {
      fajr: 1,
      sunrise: 0,
      dhuhr: 0,
      asr: 2,
      maghrib: 0,
      isha: -1,
    },
    automaticTimes: {
      date: "2026-05-02",
      today: {
        fajr: "04:55",
        sunrise: "05:33",
        dhuhr: "12:58",
        asr: "16:42",
        maghrib: "20:18",
        isha: "21:41",
      },
      tomorrow: null,
    },
  });

  assert.equal(result.effectiveSource, "aladhan");
  assert.equal(result.providerSource, "aladhan");
  assert.equal(result.manualOverride, false);
});

test("normalizePrayerTimesCurrent accepts awqat-salah as providerSource and effectiveSource", () => {
  const result = normalizePrayerTimesCurrent({
    date: "2026-07-05",
    today: {
      fajr: "03:28",
      sunrise: "05:20",
      dhuhr: "13:02",
      asr: "17:10",
      maghrib: "20:34",
      isha: "22:15",
    },
    tomorrow: null,
    updated_at: "2026-07-05T00:10:00.000Z",
    effectiveSource: "awqat-salah",
    providerSource: "awqat-salah",
    method: null,
    fetchedAt: "2026-07-05T00:10:00.000Z",
    manualOverride: false,
    offsets: {
      fajr: 0,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    },
    automaticTimes: {
      date: "2026-07-05",
      today: {
        fajr: "03:28",
        sunrise: "05:20",
        dhuhr: "13:02",
        asr: "17:10",
        maghrib: "20:34",
        isha: "22:15",
      },
      tomorrow: null,
    },
  });

  assert.equal(result.effectiveSource, "awqat-salah");
  assert.equal(result.providerSource, "awqat-salah");
  assert.equal(result.manualOverride, false);
});

test("restoreEffectivePrayerTimesFromAutomatic copies automatic times immediately when available", () => {
  const result = restoreEffectivePrayerTimesFromAutomatic(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      automaticTimes: {
        date: "2026-05-02",
        today: {
          fajr: "04:55",
          sunrise: "05:33",
          dhuhr: "12:58",
          asr: "16:42",
          maghrib: "20:18",
          isha: "21:41",
        },
        tomorrow: null,
      },
    },
    "2026-05-02T19:00:00.000Z",
  );

  assert.equal(result.manualOverride, false);
  assert.equal(result.effectiveSource, "aladhan");
  assert.equal(result.date, "2026-05-02");
  assert.equal(result.today.fajr, "04:55");
  assert.equal(result.updated_at, "2026-05-02T19:00:00.000Z");
});
