import { createPrayerTimeSyncRunner } from "./prayerTimeSyncShared.ts";
import { createAladhanProvider } from "./aladhanProvider.ts";
import type { PrayerTimeProviderResult } from "./prayerTimeProviderTypes.ts";
import {
  readPrayerTimeSyncRuntimeOptions,
  type PrayerTimeSyncRuntimeOptions,
} from "../../functions/src/prayerTimeSyncService.ts";
import type { PrayerTimesCurrent } from "../../src/types/display.ts";

interface FirestoreDocumentSnapshotLike {
  data: () => unknown;
  exists: boolean;
}

interface FirestoreDocumentLike {
  get: () => Promise<FirestoreDocumentSnapshotLike>;
  set: (value: PrayerTimesCurrent) => Promise<unknown>;
}

interface FirestoreLike {
  doc: (path: string) => FirestoreDocumentLike;
}

export interface RunProductionPrayerTimeSyncOptions {
  db: FirestoreLike;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  fetchProviderResult?: () => Promise<PrayerTimeProviderResult>;
  logError?: (message: string, error: unknown) => void;
  logInfo?: (message: string) => void;
  now?: Date;
  readRuntimeOptions?: (env: NodeJS.ProcessEnv) => PrayerTimeSyncRuntimeOptions;
}

export const PRODUCTION_PRAYER_TIME_SYNC_RUNTIME_ENTRY =
  "scripts/prayerTimes/syncPrayerTimes.ts";

export async function runProductionPrayerTimeSync({
  db,
  env = process.env,
  fetchImpl,
  fetchProviderResult,
  logError = (message, error) => {
    console.error(message, error);
  },
  logInfo = (message) => {
    console.log(message);
  },
  now,
  readRuntimeOptions = readPrayerTimeSyncRuntimeOptions,
}: RunProductionPrayerTimeSyncOptions) {
  const runtimeOptions = readRuntimeOptions(env);
  const ref = db.doc("prayerTimes/current");

  logInfo(`SYNC_RUNTIME_ENTRY: ${PRODUCTION_PRAYER_TIME_SYNC_RUNTIME_ENTRY}`);
  logInfo("SYNC_DOC_PATH: prayerTimes/current");
  logInfo(`SYNC_ENV_TARGET_PATH: ${env.PRAYER_SYNC_TARGET_PATH ?? "unset"}`);

  const providerResultLoader =
    fetchProviderResult ??
    (() =>
      createAladhanProvider().fetchAutomaticTimes(
        runtimeOptions.providerConfig,
        runtimeOptions.offsets,
        fetchImpl,
        now,
      ));

  const result = await createPrayerTimeSyncRunner({
    fetchCurrent: async () => {
      const snapshot = await ref.get();
      return snapshot.exists ? snapshot.data() : null;
    },
    fetchProviderResult: providerResultLoader,
    saveCurrent: async (value) => {
      await ref.set(value);
    },
    logError,
  }).run();

  logInfo(`Prayer times synced to prayerTimes/current from ${result.providerSource ?? "unknown"}`);

  return result;
}
