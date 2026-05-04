import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import { runProductionAwqatSalahSync } from "../scripts/prayerTimes/syncAwqatSalahRuntime.ts";
import type { PrayerTimesCurrent } from "../src/types/display.ts";

function createFakeDb(initialValue: unknown) {
  const state = {
    paths: [] as string[],
    valueByPath: {
      "prayerTimes/current": initialValue,
    } as Record<string, unknown>,
    writes: [] as Array<{ path: string; value: unknown }>,
  };

  return {
    db: {
      doc(path: string) {
        state.paths.push(path);

        return {
          async get() {
            return {
              data: () => state.valueByPath[path],
              exists: state.valueByPath[path] != null,
            };
          },
          async set(value: unknown) {
            state.valueByPath[path] = value;
            state.writes.push({ path, value });
          },
        };
      },
    } as never,
    state,
  };
}

function createMockFetch(): typeof fetch {
  return (async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/Auth/Login") && method === "POST") {
      return new Response(
        JSON.stringify({
          data: {
            accessToken: "fake-access-token",
            refreshToken: "fake-refresh-token",
            tokenType: "Bearer",
          },
          success: true,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/PrayerTime/Daily/14096") && method === "GET") {
      return new Response(
        JSON.stringify({
          data: [
            {
              asr: "17:10",
              dhuhr: "13:02",
              fajr: "03:28",
              gregorianDateLongIso8601: "2026-07-05T00:00:00+03:00",
              isha: "22:15",
              maghrib: "20:34",
              sunrise: "05:20",
            },
          ],
          success: true,
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({ message: "not found" }), { status: 404 });
  }) as typeof fetch;
}

test("production Awqat Salah sync skips when settings/prayerTimes is missing (defaults to manual)", async () => {
  const logs: string[] = [];
  const { db, state } = createFakeDb(mockDisplayData.prayerTimes);
  // Do not set settings/prayerTimes to simulate missing document

  await runProductionAwqatSalahSync({
    db,
    env: {},
    fetchImpl: createMockFetch(),
    logError(message, error) {
      logs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      logs.push(message);
    },
  });

  assert.equal(state.writes.length, 0);
  assert.ok(
    logs.some(
      (message) =>
        message === "[Awqat Salah Sync] Skipped: settings/prayerTimes source is manual",
    ),
  );
});

test("production Awqat Salah sync skips when settings/prayerTimes source is manual", async () => {
  const logs: string[] = [];
  const { db, state } = createFakeDb(mockDisplayData.prayerTimes);
  state.valueByPath["settings/prayerTimes"] = { source: "manual" };

  await runProductionAwqatSalahSync({
    db,
    env: {},
    fetchImpl: createMockFetch(),
    logError(message, error) {
      logs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      logs.push(message);
    },
  });

  assert.equal(state.writes.length, 0);
  assert.ok(
    logs.some(
      (message) =>
        message === "[Awqat Salah Sync] Skipped: settings/prayerTimes source is manual",
    ),
  );
});

test("production Awqat Salah sync skips when settings/prayerTimes source is aladhan", async () => {
  const logs: string[] = [];
  const { db, state } = createFakeDb(mockDisplayData.prayerTimes);
  state.valueByPath["settings/prayerTimes"] = { source: "aladhan" };

  await runProductionAwqatSalahSync({
    db,
    env: {},
    fetchImpl: createMockFetch(),
    logError(message, error) {
      logs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      logs.push(message);
    },
  });

  assert.equal(state.writes.length, 0);
  assert.ok(logs.some((message) => /skipped/i.test(message)));
  assert.ok(logs.some((message) => /aladhan/i.test(message)));
});

test("production Awqat Salah sync writes to prayerTimes/current when source is awqat-salah", async () => {
  const logs: string[] = [];
  const { db, state } = createFakeDb({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    automaticTimes: null,
  });
  state.valueByPath["settings/prayerTimes"] = { source: "awqat-salah" };

  await runProductionAwqatSalahSync({
    db,
    env: {
      AWQAT_SALAH_USERNAME: "test-user",
      AWQAT_SALAH_PASSWORD: "test-password",
    },
    fetchImpl: createMockFetch(),
    logError(message, error) {
      logs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      logs.push(message);
    },
    now: new Date("2026-07-05T01:00:00Z"),
  });

  assert.equal(state.writes.length, 1);
  const saved = state.writes[0]?.value as PrayerTimesCurrent;

  assert.equal(saved.date, "2026-07-05");
  assert.equal(saved.today.fajr, "03:28");
  assert.equal(saved.today.sunrise, "05:20");
  assert.equal(saved.today.dhuhr, "13:02");
  assert.equal(saved.today.asr, "17:10");
  assert.equal(saved.today.maghrib, "20:34");
  assert.equal(saved.today.isha, "22:15");
  assert.equal(saved.tomorrow, null);
  assert.equal(saved.providerSource, "awqat-salah");
  assert.equal(saved.provider, "awqat");
  assert.equal(saved.source, "awqat");
  assert.equal(saved.effectiveSource, "awqat-salah");
  assert.equal(saved.validationStatus, "valid");
  assert.equal(saved.updatedAt, "2026-07-05T01:00:00.000Z");
  
  assert.deepEqual(saved.automaticTimes, {
    date: "2026-07-05",
    today: {
      fajr: "03:28",
      sunrise: "05:20",
      dhuhr: "13:02",
      asr: "17:10",
      maghrib: "20:34",
      isha: "22:15",
    },
    tomorrow: null,
  });

  assert.ok(logs.some((l) => l.includes("[Awqat Salah Sync] Completed successfully")), "should log sync completion");
  assert.doesNotMatch(logs.join("\n"), /fake-access-token/i, "no secrets in logs");
  assert.doesNotMatch(logs.join("\n"), /test-password/i, "no secrets in logs");
});

test("production Awqat Salah sync falls back to aladhan and logs the awqat failure explicitly", async () => {
  const logs: string[] = [];
  const { db, state } = createFakeDb({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    automaticTimes: null,
  });
  state.valueByPath["settings/prayerTimes"] = { source: "awqat-salah" };

  const fetchImpl = (async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/Auth/Login") && method === "POST") {
      return new Response(
        JSON.stringify({
          data: {
            accessToken: "fake-access-token",
            refreshToken: "fake-refresh-token",
            tokenType: "Bearer",
          },
          success: true,
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/api/PrayerTime/Daily/14096") && method === "GET") {
      return new Response(JSON.stringify({ message: "awqat failed" }), { status: 500 });
    }

    if (url.includes("api.aladhan.com/v1/timingsByCity/05-07-2026")) {
      return new Response(
        JSON.stringify({
          data: {
            date: { gregorian: { date: "05-07-2026" } },
            timings: {
              Fajr: "03:31",
              Sunrise: "05:21",
              Dhuhr: "13:01",
              Asr: "17:08",
              Maghrib: "20:30",
              Isha: "22:11",
            },
          },
        }),
        { status: 200 },
      );
    }

    if (url.includes("api.aladhan.com/v1/timingsByCity/06-07-2026")) {
      return new Response(
        JSON.stringify({
          data: {
            date: { gregorian: { date: "06-07-2026" } },
            timings: {
              Fajr: "03:32",
              Sunrise: "05:22",
              Dhuhr: "13:01",
              Asr: "17:09",
              Maghrib: "20:29",
              Isha: "22:10",
            },
          },
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({ message: "not found" }), { status: 404 });
  }) as typeof fetch;

  await runProductionAwqatSalahSync({
    db,
    env: {
      AWQAT_SALAH_USERNAME: "test-user",
      AWQAT_SALAH_PASSWORD: "test-password",
      PRAYER_CITY: "London",
      PRAYER_COUNTRY: "United Kingdom",
      PRAYER_TIMEZONE: "Europe/London",
      PRAYER_METHOD: "13",
    },
    fetchImpl,
    logError(message, error) {
      logs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      logs.push(message);
    },
    now: new Date("2026-07-05T01:00:00Z"),
  });

  assert.equal(state.writes.length, 1);
  const saved = state.writes[0]?.value as PrayerTimesCurrent;
  assert.equal(saved.providerSource, "aladhan");
  assert.equal(saved.provider, "aladhan");
  assert.equal(saved.source, "aladhan");
  assert.equal(saved.effectiveSource, "aladhan");
  assert.ok(logs.some((message) => /falling back to aladhan/i.test(message)));
  assert.ok(logs.some((message) => /awqat salah fetch failed/i.test(message)));
});
