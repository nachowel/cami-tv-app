import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.ts";
import type { PrayerTimesCurrent } from "../../src/types/display.ts";
import type { PrayerTimeProviderResult } from "./prayerTimeProviderTypes.ts";

function hasCompleteAutomaticTimes(providerResult: PrayerTimeProviderResult) {
  return providerResult.automaticTimes.today != null && providerResult.automaticTimes.tomorrow != null;
}

export function applySuccessfulProviderSync(
  current: PrayerTimesCurrent,
  providerResult: PrayerTimeProviderResult,
): PrayerTimesCurrent {
  const nextValue: PrayerTimesCurrent = {
    ...current,
    providerSource: providerResult.providerSource,
    method: providerResult.method,
    fetchedAt: providerResult.fetchedAt,
    offsets: providerResult.offsets,
    automaticTimes: providerResult.automaticTimes,
  };

  if (current.manualOverride) {
    return {
      ...nextValue,
      effectiveSource: "manual",
    };
  }

  return {
    ...nextValue,
    date: providerResult.automaticTimes.date,
    today: providerResult.automaticTimes.today,
    tomorrow: providerResult.automaticTimes.tomorrow,
    updated_at: providerResult.fetchedAt,
    effectiveSource: "aladhan",
  };
}

interface PrayerTimeSyncRunnerDependencies {
  fetchCurrent: () => Promise<unknown | null>;
  fetchProviderResult: () => Promise<PrayerTimeProviderResult>;
  saveCurrent: (value: PrayerTimesCurrent) => Promise<void>;
  logError: (message: string, error: unknown) => void;
}

export function createPrayerTimeSyncRunner({
  fetchCurrent,
  fetchProviderResult,
  saveCurrent,
  logError,
}: PrayerTimeSyncRunnerDependencies) {
  return {
    async run() {
      const current = normalizePrayerTimesCurrent(await fetchCurrent());

      try {
        const providerResult = await fetchProviderResult();

        if (!hasCompleteAutomaticTimes(providerResult)) {
          throw new Error("Provider result must include complete today and tomorrow prayer times.");
        }

        const nextValue = applySuccessfulProviderSync(current, providerResult);
        await saveCurrent(nextValue);
        return nextValue;
      } catch (error) {
        logError("Aladhan prayer time sync failed.", error);
        throw error;
      }
    },
  };
}
