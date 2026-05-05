import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.js";
import { validatePrayerTimesCurrent } from "./prayerTimesValidation.js";
import { toPrayerProviderAlias } from "../../src/utils/prayerTimeDocument.js";
function hasCompleteAutomaticTimes(providerResult) {
    return providerResult.automaticTimes.today != null && providerResult.automaticTimes.tomorrow != null;
}
export function applySuccessfulProviderSync(current, providerResult) {
    const providerAlias = toPrayerProviderAlias(providerResult.providerSource);
    const nextValue = {
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
export function createPrayerTimeSyncRunner({ fetchCurrent, fetchProviderResult, saveCurrent, logError, }) {
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
                    const error = new Error(`Prayer times validation failed before Firestore write:\n  ${validation.errors.join("\n  ")}`);
                    logError("Prayer times validation failed.", error);
                    throw error;
                }
                const validatedValue = {
                    ...nextValue,
                    validationStatus: "valid",
                };
                await saveCurrent(validatedValue);
                return validatedValue;
            }
            catch (error) {
                logError("Aladhan prayer time sync failed.", error);
                throw error;
            }
        },
    };
}
