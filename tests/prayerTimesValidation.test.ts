import test from "node:test";
import assert from "node:assert";
import {
  validatePrayerTimesCurrent,
  describePrayerTimesForLog,
  type PrayerTimesValidationResult,
} from "../scripts/prayerTimes/prayerTimesValidation.ts";

function makeValidPrayerTimes() {
  return {
    date: "2026-05-02",
    today: {
      fajr: "04:30",
      sunrise: "05:30",
      dhuhr: "12:30",
      asr: "16:30",
      maghrib: "20:30",
      isha: "22:00",
    },
    tomorrow: {
      fajr: "04:28",
      sunrise: "05:28",
      dhuhr: "12:28",
      asr: "16:28",
      maghrib: "20:28",
      isha: "21:58",
    },
    updated_at: "2026-05-02T02:05:00.000Z",
    effectiveSource: "aladhan" as const,
    providerSource: "aladhan" as const,
    method: 13,
    fetchedAt: "2026-05-02T02:05:00.000Z",
    manualOverride: false,
    offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    automaticTimes: {
      date: "2026-05-02",
      today: {
        fajr: "04:30",
        sunrise: "05:30",
        dhuhr: "12:30",
        asr: "16:30",
        maghrib: "20:30",
        isha: "22:00",
      },
      tomorrow: {
        fajr: "04:28",
        sunrise: "05:28",
        dhuhr: "12:28",
        asr: "16:28",
        maghrib: "20:28",
        isha: "21:58",
      },
    },
  };
}

test("validatePrayerTimesCurrent accepts valid prayer times", () => {
  const result = validatePrayerTimesCurrent(makeValidPrayerTimes());
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("validatePrayerTimesCurrent rejects null input", () => {
  const result = validatePrayerTimesCurrent(null);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /missing|not an object/i);
});

test("validatePrayerTimesCurrent rejects non-object input", () => {
  const result = validatePrayerTimesCurrent("string");
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
});

test("validatePrayerTimesCurrent rejects missing date field", () => {
  const pt = makeValidPrayerTimes();
  delete pt.date;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("date")));
});

test("validatePrayerTimesCurrent rejects empty date field", () => {
  const pt = makeValidPrayerTimes();
  (pt as Record<string, unknown>).date = "";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("date")));
});

test("validatePrayerTimesCurrent rejects invalid date format", () => {
  const pt = makeValidPrayerTimes();
  (pt as Record<string, unknown>).date = "02-05-2026";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("YYYY-MM-DD")));
});

test("validatePrayerTimesCurrent rejects missing today field", () => {
  const pt = makeValidPrayerTimes();
  delete pt.today;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("today")));
});

test("validatePrayerTimesCurrent rejects missing updated_at field", () => {
  const pt = makeValidPrayerTimes();
  delete pt.updated_at;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("updated_at")));
});

test("validatePrayerTimesCurrent rejects missing fajr in today", () => {
  const pt = makeValidPrayerTimes();
  delete pt.today.fajr;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("today.fajr")));
});

test("validatePrayerTimesCurrent rejects null fajr in today", () => {
  const pt = makeValidPrayerTimes();
  (pt.today as Record<string, unknown>).fajr = null;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("today.fajr")));
});

test("validatePrayerTimesCurrent rejects invalid HH:MM format for fajr", () => {
  const pt = makeValidPrayerTimes();
  pt.today.fajr = "4:30";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("HH:MM")));
});

test("validatePrayerTimesCurrent rejects out-of-range hour", () => {
  const pt = makeValidPrayerTimes();
  pt.today.fajr = "25:00";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("HH:MM")));
});

test("validatePrayerTimesCurrent rejects non-numeric minute", () => {
  const pt = makeValidPrayerTimes();
  pt.today.fajr = "04:XX";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("HH:MM")));
});

test("validatePrayerTimesCurrent rejects wrong time order: fajr after sunrise", () => {
  const pt = makeValidPrayerTimes();
  pt.today.fajr = "06:30";
  pt.today.sunrise = "05:30";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("Fajr") && e.includes("Sunrise")));
});

test("validatePrayerTimesCurrent rejects wrong time order: dhuhr after asr", () => {
  const pt = makeValidPrayerTimes();
  pt.today.dhuhr = "14:00";
  pt.today.asr = "12:00";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("Dhuhr") && e.includes("Asr")));
});

test("validatePrayerTimesCurrent rejects wrong time order: asr after maghrib", () => {
  const pt = makeValidPrayerTimes();
  pt.today.asr = "19:00";
  pt.today.maghrib = "18:00";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("Asr") && e.includes("Maghrib")));
});

test("validatePrayerTimesCurrent rejects wrong time order: maghrib after isha", () => {
  const pt = makeValidPrayerTimes();
  pt.today.maghrib = "23:00";
  pt.today.isha = "21:00";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("Maghrib") && e.includes("Isha")));
});

test("validatePrayerTimesCurrent accepts equal times for fajr and sunrise (edge case)", () => {
  const pt = makeValidPrayerTimes();
  pt.today.fajr = "05:30";
  pt.today.sunrise = "05:30";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not before")));
});

test("validatePrayerTimesCurrent rejects missing field in tomorrow", () => {
  const pt = makeValidPrayerTimes();
  delete pt.tomorrow!.dhuhr;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("tomorrow.dhuhr")));
});

test("validatePrayerTimesCurrent accepts null tomorrow", () => {
  const pt = makeValidPrayerTimes();
  pt.tomorrow = null;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("validatePrayerTimesCurrent rejects invalid HH:MM in tomorrow", () => {
  const pt = makeValidPrayerTimes();
  pt.tomorrow!.isha = "25:00";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("tomorrow.isha")));
});

test("validatePrayerTimesCurrent rejects wrong order in tomorrow", () => {
  const pt = makeValidPrayerTimes();
  pt.tomorrow!.fajr = "07:00";
  pt.tomorrow!.sunrise = "06:00";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("tomorrow")));
});

test("validatePrayerTimesCurrent collects multiple errors", () => {
  const pt = makeValidPrayerTimes();
  pt.today.fajr = "04:30";
  pt.today.sunrise = "03:00";
  (pt as Record<string, unknown>).date = "";
  delete pt.today.dhuhr;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test("describePrayerTimesForLog produces human-readable output", () => {
  const pt = makeValidPrayerTimes();
  const description = describePrayerTimesForLog(pt, "Europe/London", "aladhan");
  assert.match(description, /\[Prayer Times Sync Payload\]/);
  assert.match(description, /date: 2026-05-02/);
  assert.match(description, /timezone: Europe\/London/);
  assert.match(description, /source: aladhan/);
  assert.match(description, /validationStatus: valid/);
  assert.match(description, /fajr: 04:30/);
  assert.match(description, /isha: 22:00/);
  assert.match(description, /tomorrow/);
  assert.match(description, /tomorrow.*fajr: 04:28/s);
});

test("describePrayerTimesForLog omits tomorrow section when null", () => {
  const pt = makeValidPrayerTimes();
  pt.tomorrow = null;
  const description = describePrayerTimesForLog(pt, "Europe/London", "aladhan");
  assert.match(description, /today/);
  assert.doesNotMatch(description, /tomorrow:/);
});

test("describePrayerTimesForLog does not contain secret fields", () => {
  const pt = makeValidPrayerTimes();
  const description = describePrayerTimesForLog(pt, "Europe/London", "aladhan");
  assert.doesNotMatch(description, /private_key/i);
  assert.doesNotMatch(description, /client_email/i);
  assert.doesNotMatch(description, /token/i);
  assert.doesNotMatch(description, /secret/i);
  assert.doesNotMatch(description, /credential/i);
});

test("validatePrayerTimesCurrent returns all required top-level fields in errors", () => {
  const pt = { data: "something" };
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("date")));
  assert.ok(result.errors.some((e) => e.includes("today")));
  assert.ok(result.errors.some((e) => e.includes("updated_at")));
});

test("validatePrayerTimesCurrent rejects non-string date even if it looks like YYYY-MM-DD", () => {
  const pt = makeValidPrayerTimes();
  (pt as Record<string, unknown>).date = 20260502;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("YYYY-MM-DD")));
});

test("validatePrayerTimesCurrent accepts 00:00 times", () => {
  const pt = makeValidPrayerTimes();
  pt.today.fajr = "00:00";
  pt.today.sunrise = "00:00";
  pt.today.dhuhr = "00:00";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not before")));
});

test("validatePrayerTimesCurrent accepts 23:59 times", () => {
  const pt = makeValidPrayerTimes();
  pt.today.isha = "23:59";
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, true);
});

test("describePrayerTimesForLog includes executionLocalDate context in output", () => {
  const pt = makeValidPrayerTimes();
  const description = describePrayerTimesForLog(pt, "Europe/London", "aladhan");
  assert.match(description, /Europe\/London/);
  assert.match(description, /aladhan/);
});

test("validatePrayerTimesCurrent fails when manualOverride is true but this is an auto sync", () => {
  const pt = makeValidPrayerTimes();
  pt.manualOverride = true;
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, true);
});

test("validatePrayerTimesCurrent accepts all valid prayer names", () => {
  const pt = makeValidPrayerTimes();
  const result = validatePrayerTimesCurrent(pt);
  assert.equal(result.valid, true);
  assert.ok(pt.today.fajr === "04:30");
  assert.ok(pt.today.sunrise === "05:30");
  assert.ok(pt.today.dhuhr === "12:30");
  assert.ok(pt.today.asr === "16:30");
  assert.ok(pt.today.maghrib === "20:30");
  assert.ok(pt.today.isha === "22:00");
});