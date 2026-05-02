import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  buildAdminClaimUpdate,
  parseAdminClaimArguments,
  validateAdminClaimEmail,
} from "./adminClaimScriptShared.ts";

function getTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getProjectId() {
  return getTrimmedEnv("FIREBASE_PROJECT_ID") ?? getTrimmedEnv("VITE_FIREBASE_PROJECT_ID");
}

function assertAdminScriptEnvironment() {
  if (!getTrimmedEnv("GOOGLE_APPLICATION_CREDENTIALS")) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is required for the admin claim script. Point it to a Firebase service account JSON file.",
    );
  }
}

function printHelp() {
  console.log("Usage: npm run admin:set-claim -- --email someone@example.com [--remove]");
  console.log("");
  console.log("Sets or removes the Firebase custom admin claim for a user by email.");
  console.log("--remove removes only the admin claim and preserves all other custom claims.");
}

async function setAdminClaim() {
  const args = parseAdminClaimArguments(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.email) {
    throw new Error("Missing required --email argument.");
  }

  if (!validateAdminClaimEmail(args.email)) {
    throw new Error(`Invalid email address: ${args.email}`);
  }

  assertAdminScriptEnvironment();

  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: getProjectId() ?? undefined,
    });
  const auth = getAuth(app);
  const userRecord = await auth.getUserByEmail(args.email);
  const nextClaims = buildAdminClaimUpdate({
    existingClaims: userRecord.customClaims,
    remove: args.remove,
  });

  await auth.setCustomUserClaims(userRecord.uid, nextClaims);

  if (args.remove) {
    console.log(`Removed admin claim from ${userRecord.email ?? args.email}.`);
  } else {
    console.log(`Set admin claim for ${userRecord.email ?? args.email}.`);
  }

  console.log("Existing custom claims were preserved except for the admin claim change.");
  console.log("The user may need to sign out and sign back in, or refresh their ID token.");
}

void setAdminClaim().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected admin claim script error";
  console.error(`Admin claim update failed: ${message}`);
  process.exitCode = 1;
});
