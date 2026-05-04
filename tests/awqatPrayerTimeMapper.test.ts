import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import { mapAwqatToPrayerTimesDocument } from "../scripts/prayerTimes/awqatPrayerTimeMapper.ts";

const fetchedAt = "2026-07-05T00:10:00.000Z";

const awqatToday = {
  fajr: "03:28",
  sunrise: "05:20",
  dhuhr: "13:02",
  asr: "17:10",
  maghrib: "20:34",
  isha: "22:15",
  gregorianDateLongIso8601: "2026-07-05T00:00:00+03:00",
};



const awqatWinterToday = {
  fajr: "06:12",
  sunrise: "07:55",
  dhuhr: "11:58",
  asr: "14:06",
  maghrib: "15:48",
  isha: "17:29",
  gregorianDateLongIso8601: "2026-12-05T00:00:00+03:00",
};

test("Awqat mapper preserves HH:MM values exactly and sets awqat-salah as the automatic source", () => {
  const result = mapAwqatToPrayerTimesDocument({
    current: {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: 13,
      automaticTimes: null,
    },
    fetchedAt,
    today: awqatToday,
  });

  assert.equal(result.date, "2026-07-05");
  assert.equal(result.today.fajr, "03:28");
  assert.equal(result.today.sunrise, "05:20");
  assert.equal(result.today.dhuhr, "13:02");
  assert.equal(result.today.maghrib, "20:34");
  assert.equal(result.tomorrow, null);
  assert.equal(result.updated_at, fetchedAt);
  assert.equal(result.effectiveSource, "awqat-salah");
  assert.equal(result.providerSource, "awqat-salah");
  assert.equal(result.method, null);
  assert.equal(result.fetchedAt, fetchedAt);
  assert.equal(result.manualOverride, false);
  assert.deepEqual(result.offsets, mockDisplayData.prayerTimes.offsets);
  assert.deepEqual(result.automaticTimes, {
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
  });
});

test("Awqat mapper does not subtract +03:00 from prayer clock values", () => {
  const result = mapAwqatToPrayerTimesDocument({
    current: {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      automaticTimes: null,
    },
    fetchedAt,
    today: awqatToday,
  });

  assert.equal(result.today.fajr, "03:28");
  assert.equal(result.today.sunrise, "05:20");
  assert.equal(result.today.dhuhr, "13:02");
  assert.equal(result.today.maghrib, "20:34");
});

test("Awqat mapper preserves winter prayer clock values exactly without GMT shifting", () => {
  const result = mapAwqatToPrayerTimesDocument({
    current: {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      automaticTimes: null,
    },
    fetchedAt: "2026-12-05T00:10:00.000Z",
    today: awqatWinterToday,
  });

  assert.equal(result.date, "2026-12-05");
  assert.equal(result.today.fajr, "06:12");
  assert.equal(result.today.sunrise, "07:55");
  assert.equal(result.today.dhuhr, "11:58");
  assert.equal(result.today.maghrib, "15:48");
});

test("Awqat mapper preserves manual override semantics while refreshing automaticTimes", () => {
  const result = mapAwqatToPrayerTimesDocument({
    current: {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      automaticTimes: null,
    },
    fetchedAt,
    today: awqatToday,
  });

  assert.equal(result.date, mockDisplayData.prayerTimes.date);
  assert.deepEqual(result.today, mockDisplayData.prayerTimes.today);
  assert.equal(result.updated_at, mockDisplayData.prayerTimes.updated_at);
  assert.equal(result.effectiveSource, "manual");
  assert.equal(result.providerSource, "awqat-salah");
  assert.equal(result.fetchedAt, fetchedAt);
  assert.equal(result.manualOverride, true);
  assert.deepEqual(result.automaticTimes, {
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
  });
});

test("Awqat mapper never preserves current.tomorrow — always outputs null", () => {
  const existingTomorrow = {
    fajr: "03:30" as const,
    sunrise: "05:22" as const,
    dhuhr: "13:02" as const,
    asr: "17:11" as const,
    maghrib: "20:33" as const,
    isha: "22:13" as const,
  };

  const result = mapAwqatToPrayerTimesDocument({
    current: {
      ...mockDisplayData.prayerTimes,
      tomorrow: existingTomorrow,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      automaticTimes: null,
    },
    fetchedAt,
    today: awqatToday,
  });

  assert.equal(result.tomorrow, null);
  assert.equal(result.automaticTimes?.tomorrow, null);
});
