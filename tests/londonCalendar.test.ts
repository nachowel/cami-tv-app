import test from "node:test";
import assert from "node:assert/strict";

import {
  addIsoDateDays,
  formatLondonHijriDate,
  getLondonIsoDate,
  normalizeHijriDateOffset,
} from "../src/utils/londonCalendar.ts";

const septemberRegressionInstant = new Date("2026-09-18T12:00:00.000Z");

test("18 September 2026 resolves to the London Gregorian regression date", () => {
  assert.equal(getLondonIsoDate(septemberRegressionInstant), "2026-09-18");
});

test("islamic-umalqura offset zero formats 18 September 2026 as 7 Rebiulahir 1448", () => {
  assert.equal(formatLondonHijriDate(septemberRegressionInstant, 0), "7 Rebiulahir 1448");
});

test("Hijri date offset applies only to the Hijri calendar day", () => {
  assert.equal(formatLondonHijriDate(septemberRegressionInstant, -1), "6 Rebiulahir 1448");
  assert.equal(formatLondonHijriDate(septemberRegressionInstant, 0), "7 Rebiulahir 1448");
  assert.equal(formatLondonHijriDate(septemberRegressionInstant, 1), "8 Rebiulahir 1448");
  assert.equal(getLondonIsoDate(septemberRegressionInstant), "2026-09-18");
});

test("invalid Hijri offsets safely normalize to zero", () => {
  for (const invalidValue of [-2, 2, 0.5, Number.NaN, "1", null, undefined]) {
    assert.equal(normalizeHijriDateOffset(invalidValue), 0);
    assert.equal(formatLondonHijriDate(septemberRegressionInstant, invalidValue), "7 Rebiulahir 1448");
  }
});

test("ISO calendar-day addition is independent of DST-length days", () => {
  assert.equal(addIsoDateDays("2026-03-28", 1), "2026-03-29");
  assert.equal(addIsoDateDays("2026-03-29", 1), "2026-03-30");
  assert.equal(addIsoDateDays("2026-10-24", 1), "2026-10-25");
  assert.equal(addIsoDateDays("2026-10-25", 1), "2026-10-26");
});

test("London date extraction stays stable through GMT to BST and BST to GMT transitions", () => {
  assert.equal(getLondonIsoDate(new Date("2026-03-29T00:59:00.000Z")), "2026-03-29");
  assert.equal(getLondonIsoDate(new Date("2026-03-29T01:01:00.000Z")), "2026-03-29");
  assert.equal(getLondonIsoDate(new Date("2026-10-25T00:59:00.000Z")), "2026-10-25");
  assert.equal(getLondonIsoDate(new Date("2026-10-25T01:01:00.000Z")), "2026-10-25");
});

test("London midnight changes the Gregorian and Hijri dates at local midnight", () => {
  const beforeMidnight = new Date("2026-09-18T22:59:00.000Z");
  const afterMidnight = new Date("2026-09-18T23:01:00.000Z");

  assert.equal(getLondonIsoDate(beforeMidnight), "2026-09-18");
  assert.equal(formatLondonHijriDate(beforeMidnight, 0), "7 Rebiulahir 1448");
  assert.equal(getLondonIsoDate(afterMidnight), "2026-09-19");
  assert.equal(formatLondonHijriDate(afterMidnight, 0), "8 Rebiulahir 1448");
});
