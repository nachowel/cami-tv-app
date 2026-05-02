import { FIRESTORE_PATHS, normalizeFirestoreDocumentPath } from "../../src/shared/firestorePaths.ts";

export interface PrayerTimeSyncArguments {
  allowTestWrite: boolean;
  help: boolean;
  targetPath: string | null;
}

interface ResolvePrayerTimeSyncTargetPathOptions {
  targetPath?: string | null;
}

interface ResolvePrayerTimeSyncVerificationWriteAllowanceOptions {
  targetPath: string;
  allowTestWrite: boolean;
}

export function parsePrayerTimeSyncArguments(args: string[]): PrayerTimeSyncArguments {
  let allowTestWrite = false;
  let help = false;
  let targetPath: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--allow-test-write") {
      allowTestWrite = true;
      continue;
    }

    if (arg === "--help") {
      help = true;
      continue;
    }

    if (arg === "--target-path") {
      targetPath = args[index + 1] ?? null;
      index += 1;
    }
  }

  return {
    allowTestWrite,
    help,
    targetPath,
  };
}

export function resolvePrayerTimeSyncTargetPath({
  targetPath,
}: ResolvePrayerTimeSyncTargetPathOptions) {
  const trimmedTargetPath = targetPath?.trim();

  return trimmedTargetPath
    ? normalizeFirestoreDocumentPath(trimmedTargetPath)
    : FIRESTORE_PATHS.prayerTimesCurrent;
}

export function resolvePrayerTimeSyncVerificationWriteAllowance({
  targetPath,
  allowTestWrite,
}: ResolvePrayerTimeSyncVerificationWriteAllowanceOptions) {
  if (targetPath === FIRESTORE_PATHS.prayerTimesCurrent) {
    return true;
  }

  if (targetPath === FIRESTORE_PATHS.prayerTimesSyncTest) {
    return allowTestWrite;
  }

  return false;
}
