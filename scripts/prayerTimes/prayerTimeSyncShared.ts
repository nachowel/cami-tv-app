import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.ts";
import type { PrayerTimesCurrent } from "../../src/types/display.ts";
import type { PrayerTimeProviderResult } from "./prayerTimeProviderTypes.ts";
import { validatePrayerTimesCurrent } from "./prayerTimesValidation.ts";
import { toPrayerProviderAlias } from "../../src/utils/prayerTimeDocument.ts";

function hasCompleteAutomaticTimes(providerResult: PrayerTimeProviderResult) {
  return providerResult.automaticTimes.today != null && providerResult.automaticTimes.tomorrow != null;
}

export function applySuccessfulProviderSync(
  current: PrayerTimesCurrent,
  providerResult: PrayerTimeProviderResult,
): PrayerTimesCurrent {
  const providerAlias = toPrayerProviderAlias(providerResult.providerSource);
  const nextValue: PrayerTimesCurrent = {
    ...current,
    updatedAt: providerResult.fetchedAt,
    providerSource: providerResult.providerSource,
    provider: providerAlias,
    source: providerAlias,
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

        const validation = validatePrayerTimesCurrent(nextValue);
        if (!validation.valid) {
          const error = new Error(
            `Prayer times validation failed before Firestore write:\n  ${validation.errors.join("\n  ")}`,
          );
          logError("Prayer times validation failed.", error);
          throw error;
        }

        const validatedValue: PrayerTimesCurrent = {
          ...nextValue,
          validationStatus: "valid",
        };

        await saveCurrent(validatedValue);
        return validatedValue;
      } catch (error) {
        logError("Aladhan prayer time sync failed.", error);
        throw error;
      }
    },
  };
}
