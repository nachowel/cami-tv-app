import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import { runProductionPrayerTimeSync } from "../scripts/prayerTimes/syncPrayerTimesRuntime.ts";
import { describePrayerTimesForLog } from "../scripts/prayerTimes/prayerTimesValidation.ts";

const providerResult = {
  providerSource: "aladhan" as const,
  method: 13,
  fetchedAt: "2026-05-02T03:40:00.000Z",
  offsets: {
    fajr: 1,
    sunrise: 0,
    dhuhr: 0,
    asr: 2,
    maghrib: 0,
    isha: -1,
  },
  automaticTimes: {
    date: "2026-05-02" as const,
    today: {
      fajr: "04:32",
      sunrise: "05:17",
      dhuhr: "12:56",
      asr: "16:45",
      maghrib: "20:22",
      isha: "21:49",
    },
    tomorrow: {
      fajr: "04:30",
      sunrise: "05:15",
      dhuhr: "12:56",
      asr: "16:46",
      maghrib: "20:24",
      isha: "21:51",
    },
  },
};

function assertNoRestStyleFirestorePath(path: string) {
  assert.doesNotMatch(path, /projects\//);
  assert.doesNotMatch(path, /databases\/\(default\)/);
  assert.doesNotMatch(path, /\/documents\//);
}

function createFakeDb(initialValue: unknown) {
  const state = {
    paths: [] as string[],
    value: initialValue,
    writes: [] as unknown[],
  };

  return {
    db: {
      doc(path: string) {
        state.paths.push(path);

        return {
          async get() {
            return {
              data: () => state.value,
              exists: state.value != null,
            };
          },
          async set(value: unknown) {
            state.value = value;
            state.writes.push(value);
          },
        };
      },
    } as never,
    state,
  };
}

test("production prayer sync runtime logs the fixed SDK doc path and ignores REST-style env path values", async () => {
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

  await runProductionPrayerTimeSync({
    db,
    env: {
      PRAYER_SYNC_TARGET_PATH: "projects/test-project/databases/(default)/documents/prayerTimes/current",
      FIREBASE_PROJECT_ID: "projects/test-project/databases/(default)",
    },
    fetchProviderResult: async () => providerResult,
    logError(message, error) {
      logs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      logs.push(message);
    },
  });

  assert.deepEqual([...new Set(state.paths)], ["prayerTimes/current"]);
  for (const path of state.paths) {
    assertNoRestStyleFirestorePath(path);
  }
  assert.ok(logs.some((l) => l.includes("[Prayer Times Sync] Starting")), "should log sync start");
  assert.ok(logs.some((l) => l.includes("provider: aladhan")), "should log provider");
  assert.ok(logs.some((l) => l.includes("timezone: Europe/London")), "should log timezone");
  assert.ok(logs.some((l) => l.includes("city: London")), "should log city");
  assert.ok(logs.some((l) => l.includes("[Prayer Times Sync] Completed successfully")), "should log sync completion");
  assert.ok(logs.some((l) => l.includes("docPath: prayerTimes/current")), "should log doc path");
  assert.ok(logs.some((l) => l.includes("source: aladhan")), "should log source");
});

test("saved Firestore document has validationStatus valid and all backward-compatible fields", async () => {
  const { db, state } = createFakeDb({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    automaticTimes: null,
  });

  await runProductionPrayerTimeSync({
    db,
    env: {},
    fetchProviderResult: async () => providerResult,
    logInfo() {},
    logError() {},
  });

  assert.equal(state.writes.length, 1);
  const saved = state.writes[0] as Record<string, unknown>;

  assert.ok("date" in saved, "backward-compatible: date field present");
  assert.ok("today" in saved, "backward-compatible: today field present");
  assert.ok("tomorrow" in saved, "backward-compatible: tomorrow field present");
  assert.ok("updated_at" in saved, "backward-compatible: updated_at field present");
  assert.ok("effectiveSource" in saved, "backward-compatible: effectiveSource field present");
  assert.ok("providerSource" in saved, "backward-compatible: providerSource field present");
  assert.ok("automaticTimes" in saved, "backward-compatible: automaticTimes field present");
  assert.ok("offsets" in saved, "backward-compatible: offsets field present");
  assert.ok("manualOverride" in saved, "backward-compatible: manualOverride field present");

  const today = saved.today as Record<string, unknown>;
  assert.ok("fajr" in today, "backward-compatible: today.fajr present");
  assert.ok("sunrise" in today, "backward-compatible: today.sunrise present");
  assert.ok("dhuhr" in today, "backward-compatible: today.dhuhr present");
  assert.ok("asr" in today, "backward-compatible: today.asr present");
  assert.ok("maghrib" in today, "backward-compatible: today.maghrib present");
  assert.ok("isha" in today, "backward-compatible: today.isha present");

  assert.equal(saved.date, "2026-05-02");
  assert.equal(saved.effectiveSource, "aladhan");
  assert.equal(saved.providerSource, "aladhan");
  assert.equal(saved.manualOverride, false);
});

test("describePrayerTimesForLog includes docPath when provided", () => {
  const payload = {
    date: "2026-05-02",
    today: { fajr: "04:30", sunrise: "05:30", dhuhr: "12:30", asr: "16:30", maghrib: "20:30", isha: "22:00" },
    tomorrow: { fajr: "04:28", sunrise: "05:28", dhuhr: "12:28", asr: "16:28", maghrib: "20:28", isha: "21:58" },
    updated_at: "2026-05-02T02:05:00.000Z",
    effectiveSource: "aladhan" as const,
    providerSource: "aladhan" as const,
    method: 13,
    fetchedAt: "2026-05-02T02:05:00.000Z",
    manualOverride: false,
    offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    automaticTimes: null,
  };

  const output = describePrayerTimesForLog(payload as never, "Europe/London", "aladhan", "prayerTimes/current");
  assert.match(output, /docPath: prayerTimes\/current/);
  assert.match(output, /date: 2026-05-02/);
  assert.match(output, /timezone: Europe\/London/);
  assert.match(output, /source: aladhan/);
  assert.match(output, /validationStatus: valid/);
  assert.doesNotMatch(output, /private_key/i);
  assert.doesNotMatch(output, /client_email/i);
});

test("cron schedule comment in workflow is accurate about UTC behavior", async () => {
  const { readFileSync } = await import("node:fs");
  const yaml = readFileSync(".github/workflows/prayer-times-sync.yml", "utf8");
  assert.match(yaml, /GitHub Actions always interprets the cron expression in UTC/i);
  assert.match(yaml, /02:00 UTC every day/i);
  assert.doesNotMatch(yaml, /UK 02:00 UTC = 03:00 BST/i);
});