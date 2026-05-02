import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  createScheduledPrayerTimeSyncHandler,
  SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE,
  SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE,
} from "../functions/src/scheduledPrayerTimeSync.ts";

test("scheduled prayer time sync uses the daily 00:10 Europe/London schedule", () => {
  assert.equal(SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE, "10 0 * * *");
  assert.equal(SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE, "Europe/London");
});

test("scheduled prayer time sync delegates prayerTimes/current to the shared sync service", async () => {
  const db = { kind: "firestore" };
  const calls: Array<Record<string, unknown>> = [];
  const handler = createScheduledPrayerTimeSyncHandler({
    db: db as never,
    readRuntimeOptions: () => ({
      offsets: {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      },
      providerConfig: {
        city: "London",
        country: "United Kingdom",
        timezone: "Europe/London",
        method: 13,
      },
    }),
    runPrayerTimeSync: async (options) => {
      calls.push(options as Record<string, unknown>);
      return mockDisplayData.prayerTimes;
    },
  });

  await handler({} as never);

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.db, db);
  assert.equal("targetPath" in (calls[0] ?? {}), false);
  assert.deepEqual(calls[0]?.providerConfig, {
    city: "London",
    country: "United Kingdom",
    timezone: "Europe/London",
    method: 13,
  });
  assert.deepEqual(calls[0]?.offsets, {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  });
  assert.equal(typeof calls[0]?.logInfo, "function");
  assert.equal(typeof calls[0]?.logError, "function");
});
