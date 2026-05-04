import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

test("Awqat Salah login smoke test fails safely when credentials are missing", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/testAwqatSalahLogin.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "",
        AWQAT_SALAH_USERNAME: "",
      },
    },
  );

  assert.notEqual(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /AWQAT_SALAH_USERNAME and AWQAT_SALAH_PASSWORD environment variables are required\./);
});

test("Awqat Salah login smoke test supports injected mock login and prints only safe output", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/testAwqatSalahLogin.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "success-with-refresh",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /Awqat Salah login succeeded/);
  assert.match(output, /Token received: yes/);
  assert.match(output, /Refresh token received: yes/);
  assert.doesNotMatch(output, /secret-user/);
  assert.doesNotMatch(output, /secret-password/);
  assert.doesNotMatch(output, /access-secret-token/);
  assert.doesNotMatch(output, /refresh-secret-token/);
});
