import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldScrollText,
  computeScrollDuration,
  computeHoldPercent,
} from "../src/components/tv/autoScrollingTextUtils.ts";

test("shouldScrollText returns false when text fits within the container", () => {
  const result = shouldScrollText({ containerWidth: 500, textWidth: 300, prefersReducedMotion: false });
  assert.equal(result, false);
});

test("shouldScrollText returns true when text overflows the container", () => {
  const result = shouldScrollText({ containerWidth: 200, textWidth: 300, prefersReducedMotion: false });
  assert.equal(result, true);
});

test("shouldScrollText returns false when text overflows but reduced motion is preferred", () => {
  const result = shouldScrollText({ containerWidth: 200, textWidth: 300, prefersReducedMotion: true });
  assert.equal(result, false);
});

test("shouldScrollText returns false when text exactly fits the container", () => {
  const result = shouldScrollText({ containerWidth: 300, textWidth: 300, prefersReducedMotion: false });
  assert.equal(result, false);
});

test("computeScrollDuration returns at least 8 seconds scroll plus 2 seconds pause for very short text", () => {
  const duration = computeScrollDuration({ textLength: 5, speed: 45, pauseMs: 2000 });
  assert.equal(duration, 8 + 2);
});

test("computeScrollDuration scales with text length at given speed and includes pause", () => {
  const duration500 = computeScrollDuration({ textLength: 500, speed: 45, pauseMs: 2000 });
  const duration1000 = computeScrollDuration({ textLength: 1000, speed: 45, pauseMs: 2000 });
  assert.ok(duration500 > 8);
  assert.ok(duration1000 > duration500);
  assert.equal(Math.round(duration500), Math.round(500 / 45) + 2);
});

test("computeScrollDuration uses default speed and pause when not specified", () => {
  const duration = computeScrollDuration({ textLength: 450 });
  assert.equal(duration, 450 / 45 + 2);
});

test("computeScrollDuration with slower speed produces longer duration", () => {
  const fast = computeScrollDuration({ textLength: 500, speed: 90, pauseMs: 2000 });
  const slow = computeScrollDuration({ textLength: 500, speed: 30, pauseMs: 2000 });
  assert.ok(slow > fast);
});

test("computeScrollDuration with longer pause produces longer total duration", () => {
  const short = computeScrollDuration({ textLength: 500, speed: 45, pauseMs: 1000 });
  const long = computeScrollDuration({ textLength: 500, speed: 45, pauseMs: 4000 });
  assert.ok(long > short);
});

test("computeHoldPercent returns a reasonable percentage for default settings", () => {
  const percent = computeHoldPercent({ textLength: 100, speed: 45, pauseMs: 2000 });
  assert.ok(percent >= 1);
  assert.ok(percent <= 20);
});

test("computeHoldPercent increases when pause is longer relative to scroll time", () => {
  const shortPause = computeHoldPercent({ textLength: 500, speed: 45, pauseMs: 1000 });
  const longPause = computeHoldPercent({ textLength: 500, speed: 45, pauseMs: 4000 });
  assert.ok(longPause > shortPause);
});

test("computeHoldPercent is capped at 20", () => {
  const percent = computeHoldPercent({ textLength: 5, speed: 45, pauseMs: 30000 });
  assert.equal(percent, 20);
});