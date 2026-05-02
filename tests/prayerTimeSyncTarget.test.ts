import test from "node:test";
import assert from "node:assert/strict";

import {
  parsePrayerTimeSyncArguments,
  resolvePrayerTimeSyncVerificationWriteAllowance,
} from "../scripts/prayerTimes/syncTarget.ts";

test("resolvePrayerTimeSyncVerificationWriteAllowance blocks test writes without the explicit allow flag", () => {
  assert.equal(
    resolvePrayerTimeSyncVerificationWriteAllowance({
      allowTestWrite: false,
    }),
    false,
  );
});

test("resolvePrayerTimeSyncVerificationWriteAllowance allows test writes only with the explicit allow flag", () => {
  assert.equal(
    resolvePrayerTimeSyncVerificationWriteAllowance({
      allowTestWrite: true,
    }),
    true,
  );
});

test("parsePrayerTimeSyncArguments defaults to no verification write allowance", () => {
  assert.deepEqual(parsePrayerTimeSyncArguments([]), {
    allowTestWrite: false,
    help: false,
  });
});

test("parsePrayerTimeSyncArguments accepts the explicit verification write flag", () => {
  assert.deepEqual(
    parsePrayerTimeSyncArguments(["--allow-test-write"]),
    {
      allowTestWrite: true,
      help: false,
    },
  );
});
