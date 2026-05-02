import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  getPrayerTimeSyncProjectId,
  readPrayerTimeSyncRuntimeOptions,
  runPrayerTimeSync,
} from "../../functions/src/prayerTimeSyncService.ts";
import {
  parsePrayerTimeSyncArguments,
  resolvePrayerTimeSyncTargetPath,
  resolvePrayerTimeSyncVerificationWriteAllowance,
} from "./syncTarget.ts";

function getTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function isExplicitlyTrue(value: string | null) {
  return value === "true";
}

function printHelp() {
  console.log("Usage: npm run prayer-times:sync -- [--target-path <path>] [--allow-test-write]");
  console.log("");
  console.log("Default target path is prayerTimes/current.");
  console.log("Verification writes to prayerTimes/syncTest require PRAYER_SYNC_ALLOW_TEST_WRITE=true or --allow-test-write.");
}

async function syncPrayerTimes() {
  const args = parsePrayerTimeSyncArguments(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const targetPath = resolvePrayerTimeSyncTargetPath({
    targetPath: args.targetPath ?? getTrimmedEnv("PRAYER_SYNC_TARGET_PATH"),
  });
  const allowTestWrite =
    args.allowTestWrite || isExplicitlyTrue(getTrimmedEnv("PRAYER_SYNC_ALLOW_TEST_WRITE"));

  if (
    !resolvePrayerTimeSyncVerificationWriteAllowance({
      targetPath,
      allowTestWrite,
    })
  ) {
    throw new Error(
      `Refusing to write prayer time sync verification data to ${targetPath}. Set PRAYER_SYNC_ALLOW_TEST_WRITE=true or pass --allow-test-write explicitly.`,
    );
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: getPrayerTimeSyncProjectId() ?? undefined,
    });
  const db = getFirestore(app);
  const runtimeOptions = readPrayerTimeSyncRuntimeOptions();

  await runPrayerTimeSync({
    db,
    logError(message, error) {
      console.error(message, error);
    },
    logInfo(message) {
      console.log(message);
    },
    offsets: runtimeOptions.offsets,
    providerConfig: runtimeOptions.providerConfig,
    targetPath,
  });
}

void syncPrayerTimes().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected prayer time sync error";
  console.error(`Prayer time sync command failed: ${message}`);
  process.exitCode = 1;
});
