import type { Firestore } from "firebase-admin/firestore";

import { createAladhanProvider } from "../../scripts/prayerTimes/aladhanProvider.ts";
import type {
  PrayerTimeProviderConfig,
  PrayerTimeProviderResult,
} from "../../scripts/prayerTimes/prayerTimeProviderTypes.ts";
import { createPrayerTimeSyncRunner } from "../../scripts/prayerTimes/prayerTimeSyncShared.ts";
import { FIRESTORE_PATHS } from "../../src/shared/firestorePaths.ts";
import type { PrayerTimeOffsets, PrayerTimesCurrent } from "../../src/types/display.ts";
import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.ts";
import { normalizePrayerTimeSourceSettings } from "../../src/utils/prayerTimeSourceSettings.ts";

function getTrimmedEnv(name: string, env: NodeJS.ProcessEnv) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function readOffset(name: string, env: NodeJS.ProcessEnv) {
  const value = getTrimmedEnv(name, env);

  if (value == null) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric prayer time offset for ${name}: ${value}`);
  }

  return parsed;
}

export interface PrayerTimeSyncLogger {
  error: (message: string, error: unknown) => void;
  info: (message: string) => void;
}

export interface PrayerTimeSyncRuntimeOptions {
  offsets: PrayerTimeOffsets;
  providerConfig: PrayerTimeProviderConfig;
}

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

export async function readPrayerTimeSourceSettings(db: FirestoreLike | Firestore) {
  const snapshot = await db.doc(FIRESTORE_PATHS.settingsPrayerTimes).get();
  return normalizePrayerTimeSourceSettings(snapshot.exists ? snapshot.data() : null);
}

export interface RunPrayerTimeSyncOptions {
  db: FirestoreLike | Firestore;
  fetchImpl?: typeof fetch;
  fetchProviderResult?: () => Promise<PrayerTimeProviderResult>;
  logError?: PrayerTimeSyncLogger["error"];
  logInfo?: PrayerTimeSyncLogger["info"];
  now?: Date;
  offsets?: PrayerTimeOffsets;
  providerConfig?: PrayerTimeProviderConfig;
}

export function getPrayerTimeSyncProjectId(env: NodeJS.ProcessEnv = process.env) {
  return getTrimmedEnv("FIREBASE_PROJECT_ID", env) ?? getTrimmedEnv("VITE_FIREBASE_PROJECT_ID", env);
}

export function readPrayerTimeSyncRuntimeOptions(
  env: NodeJS.ProcessEnv = process.env,
): PrayerTimeSyncRuntimeOptions {
  return {
    offsets: {
      fajr: readOffset("PRAYER_OFFSET_FAJR", env),
      sunrise: readOffset("PRAYER_OFFSET_SUNRISE", env),
      dhuhr: readOffset("PRAYER_OFFSET_DHUHR", env),
      asr: readOffset("PRAYER_OFFSET_ASR", env),
      maghrib: readOffset("PRAYER_OFFSET_MAGHRIB", env),
      isha: readOffset("PRAYER_OFFSET_ISHA", env),
    },
    providerConfig: {
      city: getTrimmedEnv("PRAYER_CITY", env) ?? "London",
      country: getTrimmedEnv("PRAYER_COUNTRY", env) ?? "United Kingdom",
      timezone: getTrimmedEnv("PRAYER_TIMEZONE", env) ?? "Europe/London",
      method: Number(getTrimmedEnv("PRAYER_METHOD", env) ?? "13"),
    },
  };
}

export async function runPrayerTimeSync({
  db,
  fetchImpl,
  fetchProviderResult,
  logError = (message, error) => {
    console.error(message, error);
  },
  logInfo = (message) => {
    console.log(message);
  },
  now,
  offsets,
  providerConfig,
}: RunPrayerTimeSyncOptions) {
  const firestorePath = FIRESTORE_PATHS.prayerTimesCurrent;
  const prayerTimeSourceSettings = await readPrayerTimeSourceSettings(db);

  if (prayerTimeSourceSettings.source !== "aladhan") {
    logInfo(
      `Prayer time sync skipped because ${FIRESTORE_PATHS.settingsPrayerTimes} source is ${prayerTimeSourceSettings.source}.`,
    );

    const currentSnapshot = await db.doc(firestorePath).get();
    return normalizePrayerTimesCurrent(currentSnapshot.exists ? currentSnapshot.data() : null);
  }

  const loadProviderResult =
    fetchProviderResult ??
    (() => {
      if (providerConfig == null || offsets == null) {
        throw new Error(
          "providerConfig and offsets are required when fetchProviderResult is not supplied.",
        );
      }

      return createAladhanProvider().fetchAutomaticTimes(providerConfig, offsets, fetchImpl, now);
    });

  const result = await createPrayerTimeSyncRunner({
    fetchCurrent: async () => {
      const snapshot = await db.doc(firestorePath).get();
      return snapshot.exists ? snapshot.data() : null;
    },
    fetchProviderResult: loadProviderResult,
    saveCurrent: async (value) => {
      await db.doc(firestorePath).set(value);
    },
    logError,
  }).run();

  logInfo(`Prayer times synced to ${firestorePath} from ${result.providerSource ?? "unknown"}`);

  return result;
}
