import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const prayerTimesPanelSource = readFileSync(
  new URL("../src/components/tv/PrayerTimesPanel.tsx", import.meta.url),
  "utf8",
);

const tvDisplaySource = readFileSync(
  new URL("../src/routes/TvDisplay.tsx", import.meta.url),
  "utf8",
);

test("PrayerTimesPanel derives the automatic provider label from Firestore prayer data", () => {
  assert.match(prayerTimesPanelSource, /const provider = prayerTimes\.provider/);
  assert.doesNotMatch(prayerTimesPanelSource, /UI SOURCE DEBUG/);
  assert.doesNotMatch(prayerTimesPanelSource, /prayerTimes\.providerSource/);
  assert.doesNotMatch(prayerTimesPanelSource, /prayerTimes\.effectiveSource === "manual"/);
});

test("TvDisplay does not emit prayer documents or provider diagnostics to the production console", () => {
  assert.doesNotMatch(tvDisplaySource, /FULL PRAYER DATA/);
  assert.doesNotMatch(tvDisplaySource, /\[PRAYER SOURCE\]/);
  assert.doesNotMatch(tvDisplaySource, /provider missing on prayerTimes\/current/);
});
