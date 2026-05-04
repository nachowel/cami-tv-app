import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

test("Awqat Salah city discovery prints best match first and caps fallback candidates", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/findAwqatSalahCity.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "city-discovery-london",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /Best match:/);
  assert.match(output, /cityId:\s*101/);
  assert.match(output, /cityName:\s*London/);
  assert.match(output, /Fallback candidates:/);
  assert.match(output, /cityId:\s*501/);
  assert.doesNotMatch(output, /Fallback 11/);
  assert.doesNotMatch(output, /secret-user/);
  assert.doesNotMatch(output, /secret-password/);
  assert.doesNotMatch(output, /access-secret-token/);
});

test("Awqat Salah city discovery fails safely when no UK country candidate exists", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/findAwqatSalahCity.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "city-discovery-no-country",
      },
    },
  );

  assert.notEqual(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /No INGILTERE, England, United Kingdom, UK, or Great Britain country candidate was found\./);
  assert.doesNotMatch(output, /secret-user/);
  assert.doesNotMatch(output, /secret-password/);
});

test("Awqat Salah city discovery prints fallback candidates when no London or Bexley match is found", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/findAwqatSalahCity.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "city-discovery-fallback-only",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /No London\/Bexley candidate found\./);
  assert.match(output, /Fallback candidates:/);
  assert.match(output, /cityName:\s*Manchester/);
  assert.doesNotMatch(output, /Best match:/);
});

test("Awqat Salah city discovery debug mode prints the full unfiltered country list safely", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/findAwqatSalahCity.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_DEBUG_MODE: "country-list",
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "city-discovery-country-debug",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /DEBUG: Full country list/);
  assert.match(output, /countryId:\s*1/);
  assert.match(output, /countryName:\s*Türkiye/);
  assert.match(output, /countryId:\s*2/);
  assert.match(output, /countryName:\s*İngiltere/);
  assert.doesNotMatch(output, /Best match:/);
  assert.doesNotMatch(output, /Fallback candidates:/);
  assert.doesNotMatch(output, /secret-user/);
  assert.doesNotMatch(output, /secret-password/);
  assert.doesNotMatch(output, /access-secret-token/);
});

test("Awqat Salah city discovery debug search mode prints UK city names containing LON and BEX patterns", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/prayerTimes/findAwqatSalahCity.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWQAT_SALAH_DEBUG_MODE: "uk-city-search",
        AWQAT_SALAH_PASSWORD: "secret-password",
        AWQAT_SALAH_USERNAME: "secret-user",
        AWQAT_SALAH_TEST_MODE: "city-discovery-london",
      },
    },
  );

  assert.equal(result.status, 0);
  const output = result.stdout + result.stderr;
  assert.match(output, /DEBUG: UK city names matching search patterns/);
  assert.match(output, /Patterns: LON, LOND, BEX, BEXLEY/);
  assert.match(output, /cityName:\s*London/);
  assert.match(output, /cityName:\s*Londra/);
  assert.match(output, /cityName:\s*Londonderry/);
  assert.match(output, /cityName:\s*Bexley/);
  assert.doesNotMatch(output, /secret-user/);
  assert.doesNotMatch(output, /secret-password/);
});
