import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  assertPrayerTimeSyncVerificationAppliedAutomaticFields,
  assertPrayerTimeSyncVerificationFailedWithoutWrite,
  assertPrayerTimeSyncVerificationPreservedManualFields,
} from "../scripts/prayerTimes/verifyPrayerTimeSyncShared.ts";

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

test("automatic verification accepts provider values copied to the effective top-level fields", () => {
  assertPrayerTimeSyncVerificationAppliedAutomaticFields({
    after: {
      ...mockDisplayData.prayerTimes,
      date: providerResult.automaticTimes.date,
      today: providerResult.automaticTimes.today,
      tomorrow: providerResult.automaticTimes.tomorrow,
      updated_at: providerResult.fetchedAt,
      effectiveSource: "aladhan",
      providerSource: "aladhan",
      method: providerResult.method,
      fetchedAt: providerResult.fetchedAt,
      manualOverride: false,
      offsets: providerResult.offsets,
      automaticTimes: providerResult.automaticTimes,
    },
    providerResult,
  });
});

test("manual verification accepts preserved top-level fields and refreshed automaticTimes", () => {
  const before = {
    ...mockDisplayData.prayerTimes,
      manualOverride: true as const,
      effectiveSource: "manual" as const,
      automaticTimes: null,
  };

  assertPrayerTimeSyncVerificationPreservedManualFields({
    before,
    after: {
      ...before,
      providerSource: "aladhan",
      method: providerResult.method,
      fetchedAt: providerResult.fetchedAt,
      offsets: providerResult.offsets,
      automaticTimes: providerResult.automaticTimes,
    },
    providerResult,
  });
});

test("failed verification accepts an unchanged document snapshot", () => {
  const before = {
    ...mockDisplayData.prayerTimes,
    manualOverride: true,
  };

  assertPrayerTimeSyncVerificationFailedWithoutWrite({
    before,
    after: before,
  });
});

test("failed verification rejects any document mutation", () => {
  const before = mockDisplayData.prayerTimes;
  const after = {
    ...before,
    fetchedAt: "2026-05-02T03:40:00.000Z",
  };

  assert.throws(
    () =>
      assertPrayerTimeSyncVerificationFailedWithoutWrite({
        before,
        after,
      }),
    /must leave the verification document unchanged/,
  );
});
