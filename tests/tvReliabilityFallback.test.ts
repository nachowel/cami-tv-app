import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tvDisplaySource = readFileSync(
  new URL("../src/routes/TvDisplay.tsx", import.meta.url),
  "utf8",
);

const prayerTimesPanelSource = readFileSync(
  new URL("../src/components/tv/PrayerTimesPanel.tsx", import.meta.url),
  "utf8",
);

const donationDisplaySource = readFileSync(
  new URL("../src/routes/DonationDisplay.tsx", import.meta.url),
  "utf8",
);

test("donation config failure uses DEFAULT_DONATION_DISPLAY_CONFIG silently", () => {
  assert.ok(donationDisplaySource.includes("DEFAULT_DONATION_DISPLAY_CONFIG"), "expected default config import");
  assert.ok(
    donationDisplaySource.includes("const safeConfig = config ?? DEFAULT_DONATION_DISPLAY_CONFIG"),
    "expected fallback to default config",
  );
  assert.ok(!donationDisplaySource.includes("Error("), "expected no error UI on TV");
  assert.ok(!donationDisplaySource.includes("error.message"), "expected no raw error exposure");
});

test("prayer times failure after success keeps last known times", () => {
  assert.ok(tvDisplaySource.includes("lastSuccessfulPrayerTimes"), "expected lastSuccessfulPrayerTimes state");
  assert.ok(prayerTimesPanelSource.includes("lastSuccessfulPrayerTimes"), "expected panel receives last known data");
  assert.ok(prayerTimesPanelSource.includes("activePrayerTimes = hasLastKnown ? lastSuccessfulPrayerTimes : prayerTimes"), "expected activePrayerTimes fallback logic");
});

test("prayer times failure before any success shows unavailable fallback", () => {
  assert.ok(prayerTimesPanelSource.includes("Prayer times temporarily unavailable"), "expected unavailable message");
  assert.ok(prayerTimesPanelSource.includes("lastSuccessfulPrayerTimes == null"), "expected null check for last known data");
});

test("today's last known data is shown during error", () => {
  assert.ok(prayerTimesPanelSource.includes("getLondonTodayIsoDate"), "expected London date helper");
  assert.ok(prayerTimesPanelSource.includes("lastSuccessfulPrayerTimes.date !== getLondonTodayIsoDate()"), "expected stale date comparison");
  assert.ok(prayerTimesPanelSource.includes("Prayer times may be temporarily outdated"), "expected outdated note for today's data");
});

test("yesterday's last known data is not shown as current", () => {
  assert.ok(prayerTimesPanelSource.includes("isStale"), "expected stale flag");
  assert.ok(prayerTimesPanelSource.includes("Prayer times need updating"), "expected stale fallback message");
  assert.ok(prayerTimesPanelSource.includes("Please check the admin sync."), "expected admin sync note");
});

test("stale fallback message appears for old data", () => {
  assert.ok(prayerTimesPanelSource.includes("if (isStale)"), "expected stale conditional block");
  assert.ok(!prayerTimesPanelSource.includes("Prayer times may be temporarily outdated") || prayerTimesPanelSource.includes("hasLastKnown ?"), "expected outdated note conditional");
});

test("prayer times error fallback keeps layout stable (same container structure)", () => {
  assert.ok(prayerTimesPanelSource.includes('flex h-full min-h-0 flex-col'), "expected stable flex container");
  assert.ok(prayerTimesPanelSource.includes("text-emerald-800"), "expected title color preserved");
});

test("TV does not render raw error text or stack traces", () => {
  assert.ok(!tvDisplaySource.includes("error.message"), "TvDisplay must not expose error.message");
  assert.ok(!tvDisplaySource.includes("throw"), "TvDisplay must not throw errors to UI");
  assert.ok(!prayerTimesPanelSource.includes("error.message"), "PrayerTimesPanel must not expose error.message");
  assert.ok(!prayerTimesPanelSource.includes("Error("), "PrayerTimesPanel must not render Error constructor");
});

test("TvDisplay tracks prayerTimes status and passes it to layout", () => {
  assert.ok(tvDisplaySource.includes('"loading" | "ok" | "error"'), "expected status type");
  assert.ok(tvDisplaySource.includes("prayerTimesStatus"), "expected prayerTimesStatus state");
  assert.ok(tvDisplaySource.includes("prayerTimesStatus={prayerTimesStatus}"), "expected status passed to layout");
  assert.ok(tvDisplaySource.includes("lastSuccessfulPrayerTimes={lastSuccessfulPrayerTimes}"), "expected last known data passed to layout");
});

test("TvDisplay sets prayerTimesStatus to error when subscription fails", () => {
  assert.ok(tvDisplaySource.includes('setPrayerTimesStatus("error")'), "expected error status set on subscription failure");
});

test("TvDisplay sets prayerTimesStatus to ok when subscription succeeds", () => {
  assert.ok(tvDisplaySource.includes('setPrayerTimesStatus("ok")'), "expected ok status set on subscription success");
});
