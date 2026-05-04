import test from "node:test";
import assert from "node:assert/strict";

import type { PrayerMoment } from "../src/utils/prayerTimes.ts";
import { resolvePrayerPanelState } from "../src/components/tv/prayerMomentView.ts";

const asrMoment: PrayerMoment = {
  countdownMs: 10_000,
  currentPrayer: {
    name: "asr",
    time: "14:22",
    dateTime: new Date(2026, 4, 1, 14, 22, 0),
    isPrayer: true,
  },
  nextPrayer: {
    name: "maghrib",
    time: "16:41",
    dateTime: new Date(2026, 4, 1, 16, 41, 0),
    isPrayer: true,
  },
};

test("prayer panel highlights the current prayer while next prayer card keeps the upcoming prayer", () => {
  const result = resolvePrayerPanelState(asrMoment);

  assert.equal(result.highlightedPrayer, "asr");
  assert.equal(result.nextPrayerName, "maghrib");
});

test("before the first prayer the highlight falls back to the next prayer", () => {
  const result = resolvePrayerPanelState({
    ...asrMoment,
    currentPrayer: null,
    nextPrayer: {
      name: "fajr",
      time: "06:44",
      dateTime: new Date(2026, 4, 2, 6, 44, 0),
      isPrayer: true,
    },
  });

  assert.equal(result.highlightedPrayer, "fajr");
  assert.equal(result.nextPrayerName, "fajr");
});
