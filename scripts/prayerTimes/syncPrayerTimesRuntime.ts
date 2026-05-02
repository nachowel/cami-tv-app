import { createPrayerTimeSyncRunner } from "./prayerTimeSyncShared.ts";
import { createAladhanProvider } from "./aladhanProvider.ts";
import type { PrayerTimeProviderResult } from "./prayerTimeProviderTypes.ts";
import {
  readPrayerTimeSyncRuntimeOptions,
  type PrayerTimeSyncRuntimeOptions,
} from "../../functions/src/prayerTimeSyncService.ts";
import type { PrayerTimesCurrent } from "../../src/types/display.ts";
import { describePrayerTimesForLog } from "./prayerTimesValidation.ts";

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
  const { providerConfig, offsets } = runtimeOptions;
  const ref = db.doc("prayerTimes/current");
  const executionTime = now ?? new Date();

  logInfo("[Prayer Times Sync] Starting");
  logInfo(`  provider: aladhan`);
  logInfo(`  city: ${providerConfig.city}`);
  logInfo(`  country: ${providerConfig.country}`);
  logInfo(`  timezone: ${providerConfig.timezone}`);
  logInfo(`  method: ${providerConfig.method}`);
  logInfo(
    `  offsets: fajr=${offsets.fajr}, sunrise=${offsets.sunrise}, dhuhr=${offsets.dhuhr}, asr=${offsets.asr}, maghrib=${offsets.maghrib}, isha=${offsets.isha}`,
  );

  const londonDateFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  logInfo(`  executionLocalDate: ${londonDateFormatter.format(executionTime)} (Europe/London)`);
  logInfo(`  executionUtc: ${executionTime.toISOString()}`);
  logInfo("  docPath: prayerTimes/current");

  const providerResultLoader =
    fetchProviderResult ??
    (() =>
      createAladhanProvider().fetchAutomaticTimes(
        providerConfig,
        offsets,
        fetchImpl,
        executionTime,
      ));

  const runnerResult = await createPrayerTimeSyncRunner({
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

  logInfo(describePrayerTimesForLog(runnerResult, providerConfig.timezone, runnerResult.providerSource ?? "unknown"));
  logInfo("[Prayer Times Sync] Completed successfully");
  logInfo(`  savedTo: prayerTimes/current`);
  logInfo(`  source: ${runnerResult.providerSource ?? "unknown"}`);

  return runnerResult;
}