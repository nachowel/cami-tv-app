import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

test("verifyPrayerTimeSync help path works without Firebase credentials", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/verifyPrayerTimeSync.ts", "--help"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: npm run prayer-times:verify-sync -- \[--allow-test-write\]/);
  assert.match(result.stdout, /prayerTimes\/syncTest/);
  assert.match(result.stdout, /PRAYER_SYNC_ALLOW_TEST_WRITE=true/);
});
