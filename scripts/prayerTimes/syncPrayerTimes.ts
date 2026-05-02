import process from "node:process";
import { pathToFileURL } from "node:url";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  getPrayerTimeSyncProjectId,
} from "../../functions/src/prayerTimeSyncService.ts";
import { runProductionPrayerTimeSync } from "./syncPrayerTimesRuntime.ts";

function printHelp() {
  console.log("Usage: npm run prayer-times:sync");
  console.log("");
  console.log("Writes only to prayerTimes/current.");
}

function shouldPrintHelp(args: string[]) {
  return args.includes("--help");
}

export async function syncPrayerTimes(args = process.argv.slice(2), env = process.env) {
  if (shouldPrintHelp(args)) {
    printHelp();
    return;
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: getPrayerTimeSyncProjectId(env) ?? undefined,
    });
  const db = getFirestore(app);

  await runProductionPrayerTimeSync({
    db,
    env,
    logError(message, error) {
      console.error(message, error);
    },
    logInfo(message) {
      console.log(message);
    },
  });
}

if (process.argv[1] != null && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void syncPrayerTimes().catch((error) => {
    const message = error instanceof Error ? error.message : "Unexpected prayer time sync error";
    console.error(`Prayer time sync command failed: ${message}`);
    process.exitCode = 1;
  });
}
