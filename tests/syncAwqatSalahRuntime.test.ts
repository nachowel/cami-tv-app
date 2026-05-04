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
  assert.ok(logs.some((message) => /skipped/i.test(message)));
  assert.ok(logs.some((message) => /manual/i.test(message)));
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
  assert.ok(logs.some((message) => /skipped/i.test(message)));
  assert.ok(logs.some((message) => /manual/i.test(message)));
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
  assert.equal(saved.effectiveSource, "awqat-salah");
  assert.equal(saved.validationStatus, "valid");
  
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
