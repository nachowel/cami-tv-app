import assert from "node:assert/strict";

import type { PrayerTimesCurrent } from "../../src/types/display.ts";
import type { PrayerTimeProviderResult } from "./prayerTimeProviderTypes.ts";

interface AutomaticVerificationOptions {
  after: PrayerTimesCurrent;
  providerResult: PrayerTimeProviderResult;
}

interface ManualVerificationOptions {
  before: PrayerTimesCurrent;
  after: PrayerTimesCurrent;
  providerResult: PrayerTimeProviderResult;
}

interface FailedVerificationOptions {
  before: PrayerTimesCurrent;
  after: PrayerTimesCurrent;
}

export function assertPrayerTimeSyncVerificationAppliedAutomaticFields({
  after,
  providerResult,
}: AutomaticVerificationOptions) {
  assert.equal(after.manualOverride, false);
  assert.equal(after.effectiveSource, "aladhan");
  assert.equal(after.providerSource, providerResult.providerSource);
  assert.equal(after.method, providerResult.method);
  assert.equal(after.fetchedAt, providerResult.fetchedAt);
  assert.equal(after.updated_at, providerResult.fetchedAt);
  assert.deepEqual(after.offsets, providerResult.offsets);
  assert.deepEqual(after.automaticTimes, providerResult.automaticTimes);
  assert.equal(after.date, providerResult.automaticTimes.date);
  assert.deepEqual(after.today, providerResult.automaticTimes.today);
  assert.deepEqual(after.tomorrow, providerResult.automaticTimes.tomorrow);
}

export function assertPrayerTimeSyncVerificationPreservedManualFields({
  before,
  after,
  providerResult,
}: ManualVerificationOptions) {
  assert.equal(after.manualOverride, true);
  assert.equal(after.effectiveSource, "manual");
  assert.equal(after.date, before.date);
  assert.deepEqual(after.today, before.today);
  assert.deepEqual(after.tomorrow, before.tomorrow);
  assert.equal(after.updated_at, before.updated_at);
  assert.equal(after.providerSource, providerResult.providerSource);
  assert.equal(after.method, providerResult.method);
  assert.equal(after.fetchedAt, providerResult.fetchedAt);
  assert.deepEqual(after.offsets, providerResult.offsets);
  assert.deepEqual(after.automaticTimes, providerResult.automaticTimes);
}

export function assertPrayerTimeSyncVerificationFailedWithoutWrite({
  before,
  after,
}: FailedVerificationOptions) {
  assert.deepEqual(
    after,
    before,
    "Failed provider verification must leave the verification document unchanged.",
  );
}
