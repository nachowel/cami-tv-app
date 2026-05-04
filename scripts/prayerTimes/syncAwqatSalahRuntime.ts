import {
  createAwqatSalahClient,
  readAwqatSalahCredentialsFromEnv,
} from "./awqatSalahClient.ts";
import { createAladhanProvider } from "./aladhanProvider.ts";
import {
  mapAwqatToPrayerTimesDocument,
  type AwqatPrayerTimeDayInput,
} from "./awqatPrayerTimeMapper.ts";
import {
  readPrayerTimeSyncRuntimeOptions,
  readPrayerTimeSourceSettings,
} from "../../functions/src/prayerTimeSyncService.ts";
import type { PrayerTimesCurrent } from "../../src/types/display.ts";
import { FIRESTORE_PATHS } from "../../src/shared/firestorePaths.ts";
import { describePrayerTimesForLog, validatePrayerTimesCurrent } from "./prayerTimesValidation.ts";
import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.ts";
import { applySuccessfulProviderSync } from "./prayerTimeSyncShared.ts";

const LOCKED_CITY_ID = 14096;
const LOCKED_COUNTRY_ID = 15;
const LOCKED_PROVIDER_SOURCE = "awqat-salah";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toAwqatPrayerTimeDayInput(value: unknown, label: string): AwqatPrayerTimeDayInput {
  if (!isRecord(value)) {
    throw new Error(`Awqat ${label} payload item must be an object.`);
  }

  const {
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    gregorianDateLongIso8601,
  } = value;

  if (
    !isNonEmptyString(fajr) ||
    !isNonEmptyString(sunrise) ||
    !isNonEmptyString(dhuhr) ||
    !isNonEmptyString(asr) ||
    !isNonEmptyString(maghrib) ||
    !isNonEmptyString(isha) ||
    !isNonEmptyString(gregorianDateLongIso8601)
  ) {
    throw new Error(`Awqat ${label} payload is missing required prayer time fields.`);
  }

  return {
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    gregorianDateLongIso8601,
  };
}

function getSinglePrayerTimeRecord(payload: unknown, label: string) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error(`Awqat ${label} payload did not contain any records.`);
  }

  return toAwqatPrayerTimeDayInput(payload[0], label);
}

interface FirestoreDocumentSnapshotLike {
  data: () => unknown;
  exists: boolean;
}

interface FirestoreDocumentLike {
  get: () => Promise<FirestoreDocumentSnapshotLike>;
  set: (value: PrayerTimesCurrent, ...args: unknown[]) => Promise<unknown>;
}

interface FirestoreLike {
  doc: (path: string) => FirestoreDocumentLike;
}

export interface RunProductionAwqatSalahSyncOptions {
  db: FirestoreLike;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  logError?: (message: string, error: unknown) => void;
  logInfo?: (message: string) => void;
  now?: Date;
}

export async function runProductionAwqatSalahSync({
  db,
  env = process.env,
  fetchImpl,
  logError = (message, error) => {
    console.error(message, error);
  },
  logInfo = (message) => {
    console.log(message);
  },
  now,
}: RunProductionAwqatSalahSyncOptions) {
  const ref = db.doc(FIRESTORE_PATHS.prayerTimesCurrent);
  const executionTime = now ?? new Date();

  logInfo("[Awqat Salah Sync] Starting");
  logInfo(`  provider: ${LOCKED_PROVIDER_SOURCE}`);
  logInfo(`  cityId: ${LOCKED_CITY_ID}`);
  logInfo(`  countryId: ${LOCKED_COUNTRY_ID}`);

  const londonDateFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  logInfo(`  executionLocalDate: ${londonDateFormatter.format(executionTime)} (Europe/London)`);
  logInfo(`  executionUtc: ${executionTime.toISOString()}`);
  logInfo(`  docPath: ${FIRESTORE_PATHS.prayerTimesCurrent}`);

  const prayerTimeSourceSettings = await readPrayerTimeSourceSettings(db);
  logInfo(`  configuredSource: ${prayerTimeSourceSettings.source}`);

  if (prayerTimeSourceSettings.source !== "awqat-salah") {
    logInfo(
      `[Awqat Salah Sync] Skipped: ${FIRESTORE_PATHS.settingsPrayerTimes} source is ${prayerTimeSourceSettings.source}`,
    );
    logInfo(`  settingsPath: ${FIRESTORE_PATHS.settingsPrayerTimes}`);
    const snapshot = await ref.get();
    return normalizePrayerTimesCurrent(snapshot.exists ? snapshot.data() : null);
  }

  const currentSnapshot = await ref.get();
  const current = normalizePrayerTimesCurrent(currentSnapshot.exists ? currentSnapshot.data() : null);

  try {
    const credentials = readAwqatSalahCredentialsFromEnv(env);
    const client = createAwqatSalahClient(fetchImpl ? { fetchImpl } : undefined);

    await client.login(credentials);
    const dailyPayload = await client.getDailyPrayerTimes(LOCKED_CITY_ID);
    const today = getSinglePrayerTimeRecord(dailyPayload, "daily");

    const nextValue = mapAwqatToPrayerTimesDocument({
      current,
      today,
      fetchedAt: executionTime.toISOString(),
    });

    const validation = validatePrayerTimesCurrent(nextValue);
    if (!validation.valid) {
      const error = new Error(
        `Prayer times validation failed before Firestore write:\n  ${validation.errors.join("\n  ")}`,
      );
      logError("Prayer times validation failed.", error);
      throw error;
    }

    const validatedValue: PrayerTimesCurrent = {
      ...nextValue,
      validationStatus: "valid",
    };

    await ref.set(validatedValue);

    logInfo(
      describePrayerTimesForLog(
        validatedValue,
        "Europe/London",
        LOCKED_PROVIDER_SOURCE,
        FIRESTORE_PATHS.prayerTimesCurrent,
      ),
    );
    logInfo("[Awqat Salah Sync] Completed successfully");
    logInfo(`  docPath: ${FIRESTORE_PATHS.prayerTimesCurrent}`);
    logInfo(`  source: ${LOCKED_PROVIDER_SOURCE}`);

    return validatedValue;
  } catch (error) {
    logError("Awqat Salah fetch failed. Falling back to Aladhan.", error);

    const runtimeOptions = readPrayerTimeSyncRuntimeOptions(env);
    const providerResult = await createAladhanProvider().fetchAutomaticTimes(
      runtimeOptions.providerConfig,
      runtimeOptions.offsets,
      fetchImpl,
      executionTime,
    );
    const fallbackValue = applySuccessfulProviderSync(current, providerResult);

    const validation = validatePrayerTimesCurrent(fallbackValue);
    if (!validation.valid) {
      const fallbackError = new Error(
        `Prayer times validation failed before Firestore write:\n  ${validation.errors.join("\n  ")}`,
      );
      logError("Prayer times validation failed.", fallbackError);
      throw fallbackError;
    }

    const validatedValue: PrayerTimesCurrent = {
      ...fallbackValue,
      validationStatus: "valid",
    };

    await ref.set(validatedValue);

    logInfo(
      describePrayerTimesForLog(
        validatedValue,
        runtimeOptions.providerConfig.timezone,
        validatedValue.providerSource ?? "unknown",
        FIRESTORE_PATHS.prayerTimesCurrent,
      ),
    );
    logInfo("[Awqat Salah Sync] Completed successfully with Aladhan fallback");
    logInfo(`  docPath: ${FIRESTORE_PATHS.prayerTimesCurrent}`);
    logInfo(`  source: ${validatedValue.providerSource ?? "unknown"}`);

    return validatedValue;
  }
}
