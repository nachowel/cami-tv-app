import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mockDisplayData } from "../../src/data/mockDisplayData.ts";
import {
  buildFirestoreSeedPlan,
  parseSeedArguments,
  shouldWriteSeedTarget,
} from "./seedFirestoreShared.ts";

function getTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getProjectId() {
  return getTrimmedEnv("FIREBASE_PROJECT_ID") ?? getTrimmedEnv("VITE_FIREBASE_PROJECT_ID");
}

function assertSeedEnvironment() {
  if (!getTrimmedEnv("GOOGLE_APPLICATION_CREDENTIALS")) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is required for the Firestore seed script. Point it to a Firebase service account JSON file.",
    );
  }
}

function printHelp() {
  console.log("Usage: npm run seed:firestore -- [--force]");
  console.log("");
  console.log("Creates missing Firestore seed documents from src/data/mockDisplayData.ts.");
  console.log("--force overwrites existing singleton docs and announcement docs with the mock source.");
}

async function seedFirestore() {
  const args = parseSeedArguments(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  assertSeedEnvironment();

  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: getProjectId() ?? undefined,
    });
  const db = getFirestore(app);
  const plan = buildFirestoreSeedPlan(mockDisplayData);
  let createdCount = 0;
  let overwrittenCount = 0;
  let skippedCount = 0;

  for (const entry of plan.singletons) {
    const ref = db.doc(entry.path);
    const snapshot = await ref.get();

    if (!shouldWriteSeedTarget({ exists: snapshot.exists, force: args.force })) {
      skippedCount += 1;
      console.log(`skip ${entry.path}`);
      continue;
    }

    await ref.set(entry.data);

    if (snapshot.exists) {
      overwrittenCount += 1;
      console.log(`overwrite ${entry.path}`);
    } else {
      createdCount += 1;
      console.log(`create ${entry.path}`);
    }
  }

  for (const entry of plan.announcements) {
    const ref = db.doc(entry.path);
    const snapshot = await ref.get();

    if (!shouldWriteSeedTarget({ exists: snapshot.exists, force: args.force })) {
      skippedCount += 1;
      console.log(`skip ${entry.path}`);
      continue;
    }

    await ref.set(entry.data);

    if (snapshot.exists) {
      overwrittenCount += 1;
      console.log(`overwrite ${entry.path}`);
    } else {
      createdCount += 1;
      console.log(`create ${entry.path}`);
    }
  }

  console.log("");
  console.log(
    `Firestore seed complete. Created: ${createdCount}, overwritten: ${overwrittenCount}, skipped: ${skippedCount}.`,
  );
}

void seedFirestore().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected Firestore seed error";
  console.error(`Firestore seed failed: ${message}`);
  process.exitCode = 1;
});
