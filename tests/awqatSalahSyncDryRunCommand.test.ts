import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { readFileSync } from "node:fs";

test("Awqat Salah sync dry-run maps fetched payload into the final document shape safely", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/dryRunAwqatSalahSync.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "sync-dry-run",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /Awqat Salah sync dry-run/);
  assert.match(output, /cityId:\s*14096/);
  assert.match(output, /cityName:\s*LONDRA/);
  assert.match(output, /providerSource:\s*awqat-salah/);
  assert.match(output, /effectiveSource:\s*awqat-salah/);
  assert.match(output, /manualOverride:\s*false/);
  assert.match(output, /date:\s*2026-07-05/);
  assert.match(output, /fajr:\s*03:28/);
  assert.match(output, /sunrise:\s*05:20/);
  assert.match(output, /dhuhr:\s*13:02/);
  assert.match(output, /maghrib:\s*20:34/);
  assert.match(output, /automaticTimes:/);
  assert.match(output, /automaticDate:\s*2026-07-05/);
  assert.match(output, /Daily fetch succeeded/);
  assert.doesNotMatch(output, /Monthly fetch succeeded/);
  assert.doesNotMatch(output, /tomorrowAvailable/);
  assert.doesNotMatch(output, /tomorrowFajr/);
  assert.doesNotMatch(output, /secret-user/);
  assert.doesNotMatch(output, /secret-password/);
  assert.doesNotMatch(output, /access-secret-token/);
  assert.doesNotMatch(output, /refresh-secret-token/);
  assert.doesNotMatch(output, /setDoc|updateDoc|addDoc|Firestore/i);
});

test("Awqat Salah sync dry-run introduces no Firestore or Firebase write imports", () => {
  const script = readFileSync("scripts/prayerTimes/dryRunAwqatSalahSync.ts", "utf8");

  assert.doesNotMatch(script, /firebase/i);
  assert.doesNotMatch(script, /firestore/i);
  assert.doesNotMatch(script, /savePrayerTimesCurrent/);
  assert.doesNotMatch(script, /setDoc/);
  assert.doesNotMatch(script, /updateDoc/);
  assert.doesNotMatch(script, /addDoc/);
  assert.doesNotMatch(script, /writeBatch/);
});
