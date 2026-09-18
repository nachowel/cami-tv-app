import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  createPrayerTimeSourceSelectionUpdate,
  createManualPrayerTimesSaveValue,
  disableManualPrayerTimesOverride,
  getPrayerTimesAdminModeState,
  getPrayerTimesAdminSourceSummary,
  shouldShowAutomaticPrayerTimesRestoreAction,
} from "../src/components/admin/prayerTimeAdminState.ts";

test("automatic mode does not show the restore action", () => {
  const result = shouldShowAutomaticPrayerTimesRestoreAction({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "aladhan",
    providerSource: "aladhan",
    method: 13,
    fetchedAt: "2026-05-02T03:40:00.000Z",
  });

  assert.equal(result, false);
});

test("manual mode without automatic Awqat data does not show the restore action", () => {
  const result = shouldShowAutomaticPrayerTimesRestoreAction({
    ...mockDisplayData.prayerTimes,
    manualOverride: true,
    effectiveSource: "manual",
  });

  assert.equal(result, false);
});

test("automatic pending mode stays visible as waiting when effectiveSource is still manual", () => {
  const result = getPrayerTimesAdminModeState({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    automaticTimes: null,
  });

  assert.equal(result.label, "Otomatik bekleniyor");
  assert.ok(result.description.includes("Sonraki başarılı otomatik senkron"));
});

test("awqat automatic mode shows Awqat Salah as the active source", () => {
  const result = getPrayerTimesAdminModeState({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "awqat-salah",
    providerSource: "awqat-salah",
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

  assert.equal(result.label, "Otomatik: Awqat Salah");
  assert.ok(result.description.includes("Awqat Salah"));
});

test("awqat source with fresh updatedAt shows active sync instead of not implemented copy", () => {
  const result = getPrayerTimesAdminSourceSummary(
    {
      source: "awqat-salah",
      updatedAt: "2026-07-05T00:30:00.000Z",
    },
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "awqat-salah",
      providerSource: "awqat-salah",
      updatedAt: "2026-07-05T01:00:00.000Z",
      updated_at: "2026-07-05T01:00:00.000Z",
      fetchedAt: "2026-07-05T01:00:00.000Z",
    },
    new Date("2026-07-05T02:00:00.000Z"),
  );

  assert.equal(result.statusMessage, "Awqat Salah API sync active.");
  assert.equal(result.displayedPrayerTimesLabel, "Awqat Salah API");
  assert.doesNotMatch(result.statusMessage ?? "", /not implemented/i);
});

test("a recent admin update cannot make stale Awqat provider data look fresh", () => {
  const result = getPrayerTimesAdminSourceSummary(
    {
      source: "awqat-salah",
      updatedAt: "2026-09-18T18:00:30.631Z",
    },
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "awqat-salah",
      providerSource: "awqat-salah",
      fetchedAt: "2026-07-19T04:20:05.755Z",
      updatedAt: "2026-09-18T18:00:30.631Z",
      updated_at: "2026-09-18T18:00:30.631Z",
    },
    new Date("2026-09-18T18:05:00.000Z"),
  );

  assert.notEqual(result.statusMessage, "Awqat Salah API sync active.");
  assert.equal(result.statusTone, "info");
});

test("manualOverride true shows a manual warning only when displayed times are manual", () => {
  const result = getPrayerTimesAdminSourceSummary(
    {
      source: "awqat-salah",
      updatedAt: "2026-07-05T00:30:00.000Z",
    },
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: "awqat-salah",
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
    },
    new Date("2026-07-05T02:00:00.000Z"),
  );

  assert.match(result.manualOverrideWarning ?? "", /Manual override is active/);
  assert.equal(result.displayedPrayerTimesLabel, "Manual Entry");
  assert.equal(result.restoreAutomaticActionLabel, "Switch display back to automatic Awqat times");
});

test("manualOverride flag alone does not label automatic Awqat display as manual", () => {
  const result = getPrayerTimesAdminSourceSummary(
    {
      source: "awqat-salah",
      updatedAt: "2026-07-05T00:30:00.000Z",
    },
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "awqat-salah",
      providerSource: "awqat-salah",
      updatedAt: "2026-07-05T01:00:00.000Z",
      updated_at: "2026-07-05T01:00:00.000Z",
    },
    new Date("2026-07-05T02:00:00.000Z"),
  );

  assert.equal(result.manualOverrideWarning, null);
  assert.equal(result.displayedPrayerTimesLabel, "Awqat Salah API");
});

test("configured Awqat with effective Aladhan shows fallback warning", () => {
  const result = getPrayerTimesAdminSourceSummary(
    {
      source: "awqat-salah",
      updatedAt: "2026-07-05T00:30:00.000Z",
    },
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "aladhan",
      providerSource: "aladhan",
    },
    new Date("2026-07-05T02:00:00.000Z"),
  );

  assert.match(result.statusMessage ?? "", /Aladhan fallback/i);
  assert.equal(result.displayedPrayerTimesLabel, "Aladhan API");
});

test("selecting Awqat source restores saved automatic Awqat times instead of only changing the label", () => {
  const automaticTimes = {
    date: "2026-07-05" as const,
    today: {
      fajr: "03:28" as const,
      sunrise: "05:20" as const,
      dhuhr: "13:02" as const,
      asr: "17:10" as const,
      maghrib: "20:34" as const,
      isha: "22:15" as const,
    },
    tomorrow: {
      fajr: "03:30" as const,
      sunrise: "05:21" as const,
      dhuhr: "13:03" as const,
      asr: "17:11" as const,
      maghrib: "20:33" as const,
      isha: "22:14" as const,
    },
  };

  const result = createPrayerTimeSourceSelectionUpdate({
    currentPrayerTimes: {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: "awqat-salah",
      provider: "awqat",
      source: "awqat",
      fetchedAt: "2026-07-05T00:10:00.000Z",
      updatedAt: "2026-07-05T00:10:05.000Z",
      updated_at: "2026-07-05T00:10:05.000Z",
      automaticTimes,
    },
    currentSettings: {
      source: "manual",
      updatedAt: null,
    },
    nextSource: "awqat-salah",
    updatedAt: "2026-07-05T12:00:00.000Z",
    updatedBy: "admin@example.com",
  });

  assert.equal(result.nextSettings.source, "awqat-salah");
  assert.equal(result.nextPrayerTimesCurrent?.manualOverride, false);
  assert.equal(result.nextPrayerTimesCurrent?.effectiveSource, "awqat-salah");
  assert.equal(result.nextPrayerTimesCurrent?.providerSource, "awqat-salah");
  assert.equal(result.nextPrayerTimesCurrent?.provider, "awqat");
  assert.equal(result.nextPrayerTimesCurrent?.source, "awqat");
  assert.equal(result.nextPrayerTimesCurrent?.today.fajr, "03:28");
  assert.equal(result.nextPrayerTimesCurrent?.tomorrow?.fajr, "03:30");
  assert.equal(result.nextPrayerTimesCurrent?.fetchedAt, "2026-07-05T00:10:00.000Z");
  assert.equal(result.nextPrayerTimesCurrent?.updatedAt, "2026-07-05T00:10:05.000Z");
});

test("selecting Awqat source without saved automatic Awqat times only updates source settings", () => {
  const result = createPrayerTimeSourceSelectionUpdate({
    currentPrayerTimes: {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      automaticTimes: null,
    },
    currentSettings: {
      source: "manual",
      updatedAt: null,
    },
    nextSource: "awqat-salah",
    updatedAt: "2026-07-05T12:00:00.000Z",
    updatedBy: "admin@example.com",
  });

  assert.equal(result.nextSettings.source, "awqat-salah");
  assert.equal(result.nextPrayerTimesCurrent, null);
  assert.match(result.userMessage, /waiting for next sync/i);
});

test("manualOverride true means TV remains on manual top-level times", () => {
  const result = getPrayerTimesAdminSourceSummary(
    {
      source: "awqat-salah",
      updatedAt: "2026-07-05T00:30:00.000Z",
    },
    {
      ...mockDisplayData.prayerTimes,
      today: {
        ...mockDisplayData.prayerTimes.today,
        fajr: "06:44",
      },
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: "awqat-salah",
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
    },
  );

  assert.equal(result.displayedPrayerTimesLabel, "Manual Entry");
  assert.match(result.manualOverrideWarning ?? "", /manual/i);
});

test("manualOverride false with Awqat automaticTimes means TV can display automatic Awqat times", () => {
  const automaticTimes = {
    date: "2026-07-05" as const,
    today: {
      fajr: "03:28" as const,
      sunrise: "05:20" as const,
      dhuhr: "13:02" as const,
      asr: "17:10" as const,
      maghrib: "20:34" as const,
      isha: "22:15" as const,
    },
    tomorrow: null,
  };
  const restored = disableManualPrayerTimesOverride(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: "awqat-salah",
      provider: "awqat",
      source: "awqat",
      automaticTimes,
    },
    "2026-07-05T12:00:00.000Z",
  ).nextValue;

  assert.equal(restored.manualOverride, false);
  assert.equal(restored.effectiveSource, "awqat-salah");
  assert.equal(restored.today.fajr, automaticTimes.today.fajr);
});

test("createManualPrayerTimesSaveValue updates effective prayer times and preserves automaticTimes", () => {
  const result = createManualPrayerTimesSaveValue(
    {
      ...mockDisplayData.prayerTimes,
      automaticTimes: {
        date: "2026-05-02",
        today: {
          fajr: "04:31",
          sunrise: "05:17",
          dhuhr: "12:56",
          asr: "16:43",
          maghrib: "20:22",
          isha: "21:50",
        },
        tomorrow: {
          fajr: "04:29",
          sunrise: "05:15",
          dhuhr: "12:56",
          asr: "16:44",
          maghrib: "20:24",
          isha: "21:52",
        },
      },
      manualOverride: false,
      effectiveSource: "aladhan",
      providerSource: "aladhan",
      fetchedAt: "2026-05-02T03:40:00.000Z",
      method: 13,
    },
    {
      ...mockDisplayData.prayerTimes.today,
      fajr: "05:55",
      dhuhr: "13:05",
    },
    "2026-05-02T12:00:00.000Z",
  );

  assert.equal(result.manualOverride, true);
  assert.equal(result.effectiveSource, "manual");
  assert.equal(result.today.fajr, "05:55");
  assert.equal(result.today.dhuhr, "13:05");
  assert.equal(result.date, mockDisplayData.prayerTimes.date);
  assert.equal(result.updated_at, "2026-05-02T12:00:00.000Z");
  assert.equal(result.automaticTimes?.today.fajr, "04:31");
  assert.equal(result.automaticTimes?.tomorrow?.maghrib, "20:24");
});

test("disableManualPrayerTimesOverride restores automaticTimes immediately when available", () => {
  const result = disableManualPrayerTimesOverride(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: "aladhan",
      method: 13,
      fetchedAt: "2026-05-02T03:40:00.000Z",
      automaticTimes: {
        date: "2026-05-02",
        today: {
          fajr: "04:31",
          sunrise: "05:17",
          dhuhr: "12:56",
          asr: "16:43",
          maghrib: "20:22",
          isha: "21:50",
        },
        tomorrow: {
          fajr: "04:29",
          sunrise: "05:15",
          dhuhr: "12:56",
          asr: "16:44",
          maghrib: "20:24",
          isha: "21:52",
        },
      },
    },
    "2026-05-02T12:05:00.000Z",
  );

  assert.equal(result.restoredAutomaticTimes, true);
  assert.equal(result.warningMessage, null);
  assert.equal(result.nextValue.manualOverride, false);
  assert.equal(result.nextValue.effectiveSource, "aladhan");
  assert.equal(result.nextValue.date, "2026-05-02");
  assert.equal(result.nextValue.today.fajr, "04:31");
  assert.equal(result.nextValue.tomorrow?.maghrib, "20:24");
  assert.equal(result.nextValue.fetchedAt, "2026-05-02T03:40:00.000Z");
  assert.equal(result.nextValue.updated_at, mockDisplayData.prayerTimes.updated_at);
});

test("disableManualPrayerTimesOverride keeps current values and returns a warning when automaticTimes is missing", () => {
  const result = disableManualPrayerTimesOverride(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      automaticTimes: null,
    },
    "2026-05-02T12:05:00.000Z",
  );

  assert.equal(result.restoredAutomaticTimes, false);
  assert.equal(result.nextValue.manualOverride, false);
  assert.equal(result.nextValue.effectiveSource, "manual");
  assert.equal(result.nextValue.today.fajr, mockDisplayData.prayerTimes.today.fajr);
  assert.equal(result.nextValue.updated_at, mockDisplayData.prayerTimes.updated_at);
  assert.ok(result.warningMessage?.includes("Otomatik mod açıldı"));
});
