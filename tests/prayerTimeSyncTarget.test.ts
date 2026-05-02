import test from "node:test";
import assert from "node:assert/strict";

import { FIRESTORE_PATHS } from "../src/shared/firestorePaths.ts";
import {
  parsePrayerTimeSyncArguments,
  resolvePrayerTimeSyncTargetPath,
  resolvePrayerTimeSyncVerificationWriteAllowance,
} from "../scripts/prayerTimes/syncTarget.ts";

test("resolvePrayerTimeSyncTargetPath defaults to prayerTimes/current", () => {
  const result = resolvePrayerTimeSyncTargetPath({});

  assert.equal(result, FIRESTORE_PATHS.prayerTimesCurrent);
});

test("resolvePrayerTimeSyncTargetPath uses an explicit test path override", () => {
  const result = resolvePrayerTimeSyncTargetPath({
    targetPath: FIRESTORE_PATHS.prayerTimesSyncTest,
  });

  assert.equal(result, FIRESTORE_PATHS.prayerTimesSyncTest);
});

test("resolvePrayerTimeSyncVerificationWriteAllowance blocks test writes without the explicit allow flag", () => {
  assert.equal(
    resolvePrayerTimeSyncVerificationWriteAllowance({
      targetPath: FIRESTORE_PATHS.prayerTimesSyncTest,
      allowTestWrite: false,
    }),
    false,
  );
});

test("resolvePrayerTimeSyncVerificationWriteAllowance allows test writes only with the explicit allow flag", () => {
  assert.equal(
    resolvePrayerTimeSyncVerificationWriteAllowance({
      targetPath: FIRESTORE_PATHS.prayerTimesSyncTest,
      allowTestWrite: true,
    }),
    true,
  );
});

test("resolvePrayerTimeSyncVerificationWriteAllowance does not require the allow flag for prayerTimes/current", () => {
  assert.equal(
    resolvePrayerTimeSyncVerificationWriteAllowance({
      targetPath: FIRESTORE_PATHS.prayerTimesCurrent,
      allowTestWrite: false,
    }),
    true,
  );
});

test("parsePrayerTimeSyncArguments keeps the production target by default", () => {
  assert.deepEqual(parsePrayerTimeSyncArguments([]), {
    allowTestWrite: false,
    help: false,
    targetPath: null,
  });
});

test("parsePrayerTimeSyncArguments accepts an explicit target path and test-write flag", () => {
  assert.deepEqual(
    parsePrayerTimeSyncArguments([
      "--target-path",
      FIRESTORE_PATHS.prayerTimesSyncTest,
      "--allow-test-write",
    ]),
    {
      allowTestWrite: true,
      help: false,
      targetPath: FIRESTORE_PATHS.prayerTimesSyncTest,
    },
  );
});
