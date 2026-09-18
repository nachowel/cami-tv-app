import type { Firestore } from "firebase-admin/firestore";

import {
  readPrayerTimeSourceSettings,
  readPrayerTimeSyncRuntimeOptions,
  runPrayerTimeSync,
  type RunPrayerTimeSyncOptions,
} from "./prayerTimeSyncService.ts";
import {
  runProductionAwqatSalahSync,
  type RunProductionAwqatSalahSyncOptions,
} from "../../scripts/prayerTimes/syncAwqatSalahRuntime.ts";

export const SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE = "10 0 * * *";
export const SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE = "Europe/London";

interface ScheduledPrayerTimeSyncHandlerDependencies {
  db: Firestore;
  getAwqatCredentials?: () => { password: string; username: string };
  readPrayerTimeSourceSettings?: typeof readPrayerTimeSourceSettings;
  readRuntimeOptions?: typeof readPrayerTimeSyncRuntimeOptions;
  runAwqatSalahSync?: (options: RunProductionAwqatSalahSyncOptions) => Promise<unknown>;
  runPrayerTimeSync?: (options: RunPrayerTimeSyncOptions) => Promise<unknown>;
}

export function createScheduledPrayerTimeSyncHandler({
  db,
  getAwqatCredentials = () => ({
    password: process.env.AWQAT_SALAH_PASSWORD ?? "",
    username: process.env.AWQAT_SALAH_USERNAME ?? "",
  }),
  readPrayerTimeSourceSettings: readSourceSettings = readPrayerTimeSourceSettings,
  readRuntimeOptions = readPrayerTimeSyncRuntimeOptions,
  runAwqatSalahSync: executeAwqatSalahSync = runProductionAwqatSalahSync,
  runPrayerTimeSync: executePrayerTimeSync = runPrayerTimeSync,
}: ScheduledPrayerTimeSyncHandlerDependencies) {
  return async () => {
    const logError = (message: string, error: unknown) => {
      console.error(message, error);
    };
    const logInfo = (message: string) => {
      console.log(message);
    };
    const sourceSettings = await readSourceSettings(db);

    if (sourceSettings.source === "awqat-salah") {
      const credentials = getAwqatCredentials();
      await executeAwqatSalahSync({
        db,
        env: {
          ...process.env,
          AWQAT_SALAH_PASSWORD: credentials.password,
          AWQAT_SALAH_USERNAME: credentials.username,
        },
        logError,
        logInfo,
      });
      return;
    }

    const runtimeOptions = readRuntimeOptions();

    await executePrayerTimeSync({
      db,
      logError,
      logInfo,
      offsets: runtimeOptions.offsets,
      providerConfig: runtimeOptions.providerConfig,
    });
  };
}
