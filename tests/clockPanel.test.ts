import test from "node:test";
import assert from "node:assert/strict";

function formatClockDate(now: Date, language: "en" | "tr") {
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const londonDay = now.toLocaleDateString(locale, {
    weekday: "long",
    timeZone: "Europe/London",
  });
  const londonDateStr = now.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  return `${londonDay}, ${londonDateStr}`;
}

test("formatClockDate produces output that depends on the input Date, not any static string", () => {
  const d1 = new Date("2026-05-01T12:00:00+01:00");
  const d2 = new Date("2026-05-02T12:00:00+01:00");
  const result1 = formatClockDate(d1, "en");
  const result2 = formatClockDate(d2, "en");

  assert.notEqual(result1, result2);
  assert.match(result1, /May/);
  assert.match(result2, /May/);
});

test("formatClockDate formats Europe/London date as Weekday, Day Month Year in English", () => {
  const londonNoon = new Date("2026-05-01T12:00:00+01:00");
  const result = formatClockDate(londonNoon, "en");

  assert.match(result, /^[A-Za-z]+, \d+ [A-Za-z]+ \d{4}$/);
  assert.match(result, /Friday/);
  assert.match(result, /May/);
  assert.match(result, /2026/);
});

test("formatClockDate formats Europe/London date in Turkish locale when language is tr", () => {
  const londonNoon = new Date("2026-05-01T12:00:00+01:00");
  const result = formatClockDate(londonNoon, "tr");

  assert.match(result, /Cuma/);
  assert.match(result, /Mayıs/);
  assert.match(result, /2026/);
});

test("formatClockDate midnight rollover: date changes at London midnight", () => {
  const beforeMidnight = new Date("2026-05-01T23:59:00+01:00");
  const afterMidnight = new Date("2026-05-02T00:01:00+01:00");

  const before = formatClockDate(beforeMidnight, "en");
  const after = formatClockDate(afterMidnight, "en");

  assert.notEqual(before, after);
  assert.match(before, /Friday/);
  assert.match(before, /1 May/);
  assert.match(after, /Saturday/);
  assert.match(after, /2 May/);
});

test("formatClockDate uses Europe/London timezone for date, not local machine timezone", () => {
  const londonNoon = new Date("2026-01-01T12:00:00+00:00");
  const result = formatClockDate(londonNoon, "en");

  assert.match(result, /Thursday/);
  assert.match(result, /1 January/);
  assert.match(result, /2026/);
});