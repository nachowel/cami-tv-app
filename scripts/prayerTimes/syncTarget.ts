export interface PrayerTimeSyncArguments {
  allowTestWrite: boolean;
  help: boolean;
}

interface PrayerTimeSyncVerificationWriteAllowanceOptions {
  allowTestWrite: boolean;
}

export function parsePrayerTimeSyncArguments(args: string[]): PrayerTimeSyncArguments {
  let allowTestWrite = false;
  let help = false;

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
  }

  return {
    allowTestWrite,
    help,
  };
}

export function resolvePrayerTimeSyncVerificationWriteAllowance({
  allowTestWrite,
}: PrayerTimeSyncVerificationWriteAllowanceOptions) {
  return allowTestWrite;
}
