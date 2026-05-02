import process from "node:process";
import { pathToFileURL } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { runProductionPrayerTimeSync } from "./syncPrayerTimesRuntime.ts";

function printHelp() {
  console.log("Usage: npm run prayer-times:sync");
  console.log("");
  console.log("Writes only to prayerTimes/current.");
}

function shouldPrintHelp(args: string[]) {
  return args.includes("--help");
}

function loadServiceAccount() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. " +
        "Point it to your Firebase service account JSON file.",
    );
  }

  const raw = readFileSync(credentialsPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const projectId = parsed.project_id;
  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new Error(
      "Service account JSON is missing a valid \"project_id\" string field. " +
        "Ensure your service account file contains \"project_id\" with a non-empty string value.",
    );
  }

  const clientEmail = parsed.client_email;
  if (typeof clientEmail !== "string" || clientEmail.length === 0) {
    throw new Error(
      "Service account JSON is missing a valid \"client_email\" string field.",
    );
  }

  const privateKey = parsed.private_key;
  if (typeof privateKey !== "string" || privateKey.length === 0) {
    throw new Error(
      "Service account JSON is missing a valid \"private_key\" string field.",
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export async function syncPrayerTimes(args = process.argv.slice(2), env = process.env) {
  console.log("PROJECT_ID_ENV:", env.FIREBASE_PROJECT_ID ?? "unset");
  console.log("GOOGLE_APPLICATION_CREDENTIALS:", env.GOOGLE_APPLICATION_CREDENTIALS ?? "unset");

  const { projectId, clientEmail, privateKey } = loadServiceAccount();

  if (shouldPrintHelp(args)) {
    printHelp();
    return;
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
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
