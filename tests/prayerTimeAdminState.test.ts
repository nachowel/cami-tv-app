import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  createManualPrayerTimesSaveValue,
  disableManualPrayerTimesOverride,
  getPrayerTimesAdminModeState,
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

test("manual mode shows the restore action", () => {
  const result = shouldShowAutomaticPrayerTimesRestoreAction({
    ...mockDisplayData.prayerTimes,
    manualOverride: true,
    effectiveSource: "manual",
  });

  assert.equal(result, true);
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
  assert.ok(result.description.includes("Sonraki başarılı Aladhan senkronundan sonra"));
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
  assert.equal(result.nextValue.updated_at, "2026-05-02T12:05:00.000Z");
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
