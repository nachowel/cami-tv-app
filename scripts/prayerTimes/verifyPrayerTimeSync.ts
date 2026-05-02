import assert from "node:assert/strict";
import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import {
  getPrayerTimeSyncProjectId,
  readPrayerTimeSyncRuntimeOptions,
  runPrayerTimeSync,
} from "../../functions/src/prayerTimeSyncService.ts";
import { mockDisplayData } from "../../src/data/mockDisplayData.ts";
import { FIRESTORE_PATHS } from "../../src/shared/firestorePaths.ts";
import type { PrayerTimesCurrent, PrayerTimesForDay } from "../../src/types/display.ts";
import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.ts";
import { createAladhanProvider } from "./aladhanProvider.ts";
import { createPrayerTimeSyncRunner } from "./prayerTimeSyncShared.ts";
import {
  assertPrayerTimeSyncVerificationAppliedAutomaticFields,
  assertPrayerTimeSyncVerificationFailedWithoutWrite,
  assertPrayerTimeSyncVerificationPreservedManualFields,
} from "./verifyPrayerTimeSyncShared.ts";
import {
  parsePrayerTimeSyncArguments,
  resolvePrayerTimeSyncVerificationWriteAllowance,
} from "./syncTarget.ts";

function getTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function isExplicitlyTrue(value: string | null) {
  return value === "true";
}

function getProjectId() {
  return getPrayerTimeSyncProjectId();
}

function assertVerificationEnvironment() {
  if (!getTrimmedEnv("GOOGLE_APPLICATION_CREDENTIALS")) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is required for prayer time sync verification. Point it to a Firebase service account JSON file.",
    );
  }
}

function printHelp() {
  console.log("Usage: npm run prayer-times:verify-sync -- [--allow-test-write]");
  console.log("");
  console.log(`Runs real prayer-time sync verification against ${FIRESTORE_PATHS.prayerTimesSyncTest} only.`);
  console.log("Requires PRAYER_SYNC_ALLOW_TEST_WRITE=true or --allow-test-write before any write is attempted.");
}

function createVerificationSeedValue(manualOverride: boolean): PrayerTimesCurrent {
  return {
    ...mockDisplayData.prayerTimes,
    manualOverride,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    offsets: {
      fajr: 0,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    },
    automaticTimes: null,
  };
}

function assertCleanTime(value: string, label: string) {
  assert.match(value, /^\d{2}:\d{2}$/, `${label} must be normalized to HH:mm.`);
}

function assertCleanTimesForDay(day: PrayerTimesForDay, label: string) {
  assertCleanTime(day.fajr, `${label}.fajr`);
  assertCleanTime(day.sunrise, `${label}.sunrise`);
  assertCleanTime(day.dhuhr, `${label}.dhuhr`);
  assertCleanTime(day.asr, `${label}.asr`);
  assertCleanTime(day.maghrib, `${label}.maghrib`);
  assertCleanTime(day.isha, `${label}.isha`);
}

function assertProviderResultShape(result: Awaited<ReturnType<ReturnType<typeof createAladhanProvider>["fetchAutomaticTimes"]>>) {
  assert.equal(result.providerSource, "aladhan");
  assert.equal(result.method, 13);
  assert.ok(result.automaticTimes.today, "Provider result must include today's timings.");
  assert.ok(result.automaticTimes.tomorrow, "Provider result must include tomorrow's timings.");
  assertCleanTimesForDay(result.automaticTimes.today, "automaticTimes.today");
  assertCleanTimesForDay(result.automaticTimes.tomorrow, "automaticTimes.tomorrow");
}

async function readCurrent(ref: FirebaseFirestore.DocumentReference) {
  const snapshot = await ref.get();
  return normalizePrayerTimesCurrent(snapshot.exists ? snapshot.data() : null, mockDisplayData.prayerTimes);
}

async function verifyPrayerTimeSync() {
  const args = parsePrayerTimeSyncArguments(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const allowTestWrite =
    args.allowTestWrite || isExplicitlyTrue(getTrimmedEnv("PRAYER_SYNC_ALLOW_TEST_WRITE"));

  if (
    !resolvePrayerTimeSyncVerificationWriteAllowance({
      targetPath: FIRESTORE_PATHS.prayerTimesSyncTest,
      allowTestWrite,
    })
  ) {
    throw new Error(
      `Refusing to write prayer time sync verification data to ${FIRESTORE_PATHS.prayerTimesSyncTest}. Set PRAYER_SYNC_ALLOW_TEST_WRITE=true or pass --allow-test-write explicitly.`,
    );
  }

  assertVerificationEnvironment();

  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: getProjectId() ?? undefined,
    });
  const db = getFirestore(app);
  const ref = db.doc(FIRESTORE_PATHS.prayerTimesSyncTest);
  const provider = createAladhanProvider();
  const runtimeOptions = readPrayerTimeSyncRuntimeOptions();

  const providerProbe = await provider.fetchAutomaticTimes(
    runtimeOptions.providerConfig,
    runtimeOptions.offsets,
  );
  assertProviderResultShape(providerProbe);

  const automaticBefore = createVerificationSeedValue(false);
  await ref.set(automaticBefore);
  const automaticResult = await runPrayerTimeSync({
    db,
    logError(message, error) {
      console.error(message, error);
    },
    logInfo(message) {
      console.log(message);
    },
    offsets: runtimeOptions.offsets,
    providerConfig: runtimeOptions.providerConfig,
    targetPath: FIRESTORE_PATHS.prayerTimesSyncTest,
  });
  const automaticAfter = await readCurrent(ref);
  assertPrayerTimeSyncVerificationAppliedAutomaticFields({
    after: automaticAfter,
    providerResult: automaticResult.providerSource === "aladhan" ? {
      providerSource: automaticResult.providerSource,
      method: automaticResult.method ?? 13,
      fetchedAt: automaticResult.fetchedAt ?? automaticResult.updated_at,
      offsets: automaticResult.offsets,
      automaticTimes: automaticResult.automaticTimes!,
    } : providerProbe,
  });

  const manualBefore = createVerificationSeedValue(true);
  await ref.set(manualBefore);
  const manualResult = await runPrayerTimeSync({
    db,
    logError(message, error) {
      console.error(message, error);
    },
    logInfo(message) {
      console.log(message);
    },
    offsets: runtimeOptions.offsets,
    providerConfig: runtimeOptions.providerConfig,
    targetPath: FIRESTORE_PATHS.prayerTimesSyncTest,
  });
  const manualAfter = await readCurrent(ref);
  assertPrayerTimeSyncVerificationPreservedManualFields({
    before: manualBefore,
    after: manualAfter,
    providerResult: manualResult.providerSource === "aladhan" ? {
      providerSource: manualResult.providerSource,
      method: manualResult.method ?? 13,
      fetchedAt: manualResult.fetchedAt ?? manualResult.updated_at,
      offsets: manualResult.offsets,
      automaticTimes: manualResult.automaticTimes!,
    } : providerProbe,
  });

  const failedBefore = createVerificationSeedValue(true);
  await ref.set(failedBefore);
  const failedSnapshotBefore = await readCurrent(ref);
  await assert.rejects(
    () =>
      createPrayerTimeSyncRunner({
        fetchCurrent: async () => (await ref.get()).data() ?? null,
        fetchProviderResult: async () => {
          throw new Error("verification-provider-failure");
        },
        saveCurrent: async (value) => {
          await ref.set(value);
        },
        logError(message, error) {
          console.error(message, error);
        },
      }).run(),
    /verification-provider-failure/,
  );
  const failedSnapshotAfter = await readCurrent(ref);
  assertPrayerTimeSyncVerificationFailedWithoutWrite({
    before: failedSnapshotBefore,
    after: failedSnapshotAfter,
  });

  console.log("Prayer time sync verification passed.");
  console.log(`Verified document: ${FIRESTORE_PATHS.prayerTimesSyncTest}`);
  console.log("Cases: manualOverride=false, manualOverride=true, failed provider fetch.");
}

void verifyPrayerTimeSync().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unexpected prayer time sync verification error";
  console.error(`Prayer time sync verification failed: ${message}`);
  process.exitCode = 1;
});
