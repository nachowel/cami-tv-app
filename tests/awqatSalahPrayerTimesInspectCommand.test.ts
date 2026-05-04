import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

test("Awqat Salah prayer times inspect prints sanitized daily inspection output", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/inspectAwqatSalahPrayerTimes.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "prayer-times-inspect",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /Awqat Salah prayer times inspection/);
  assert.match(output, /cityId:\s*14096/);
  assert.match(output, /Daily fetch succeeded/);
  assert.match(output, /Daily response summary/);
  assert.match(output, /candidate date keys/i);
  assert.match(output, /fajr/i);
  assert.match(output, /sunrise/i);
  assert.match(output, /dhuhr/i);
  assert.match(output, /asr/i);
  assert.match(output, /maghrib/i);
  assert.match(output, /isha/i);
  assert.doesNotMatch(output, /secret-user/);
  assert.doesNotMatch(output, /secret-password/);
  assert.doesNotMatch(output, /access-secret-token/);
  assert.doesNotMatch(output, /refresh-secret-token/);
  assert.doesNotMatch(output, /shapeMoonUrl/);
});

test("Awqat Salah prayer times inspect fetches optional monthly output only when --monthly is provided", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/inspectAwqatSalahPrayerTimes.ts", "--monthly"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "prayer-times-inspect",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /Monthly response summary/);
});
