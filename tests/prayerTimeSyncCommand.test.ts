import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

test("syncPrayerTimes help path works without Firebase credentials", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/syncPrayerTimes.ts", "--help"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /Usage: npm run prayer-times:sync/,
  );
  assert.match(result.stdout, /Default target path is prayerTimes\/current\./);
  assert.doesNotMatch(result.stdout, /target-path/);
  assert.doesNotMatch(result.stdout, /PRAYER_SYNC_TARGET_PATH/);
  assert.doesNotMatch(result.stdout, /PRAYER_SYNC_ALLOW_TEST_WRITE=true/);
});
