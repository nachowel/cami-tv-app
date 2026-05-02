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
} from "./syncTarget.ts";

function printHelp() {
  console.log("Usage: npm run prayer-times:sync");
  console.log("");
  console.log("Default target path is prayerTimes/current.");
}

async function syncPrayerTimes() {
  const args = parsePrayerTimeSyncArguments(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
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
  });
}

void syncPrayerTimes().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected prayer time sync error";
  console.error(`Prayer time sync command failed: ${message}`);
  process.exitCode = 1;
});
