import type { Firestore } from "firebase-admin/firestore";

import {
  readPrayerTimeSyncRuntimeOptions,
  runPrayerTimeSync,
  type RunPrayerTimeSyncOptions,
} from "./prayerTimeSyncService.ts";

export const SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE = "10 0 * * *";
export const SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE = "Europe/London";

interface ScheduledPrayerTimeSyncHandlerDependencies {
  db: Firestore;
  readRuntimeOptions?: typeof readPrayerTimeSyncRuntimeOptions;
  runPrayerTimeSync?: (options: RunPrayerTimeSyncOptions) => Promise<unknown>;
}

export function createScheduledPrayerTimeSyncHandler({
  db,
  readRuntimeOptions = readPrayerTimeSyncRuntimeOptions,
  runPrayerTimeSync: executePrayerTimeSync = runPrayerTimeSync,
}: ScheduledPrayerTimeSyncHandlerDependencies) {
  return async () => {
    const runtimeOptions = readRuntimeOptions();

    await executePrayerTimeSync({
      db,
      logError(message, error) {
        console.error(message, error);
      },
      logInfo(message) {
        console.log(message);
      },
      offsets: runtimeOptions.offsets,
      providerConfig: runtimeOptions.providerConfig,
    });
  };
}
