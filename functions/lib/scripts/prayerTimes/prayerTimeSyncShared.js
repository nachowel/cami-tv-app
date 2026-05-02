import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.js";
function hasCompleteAutomaticTimes(providerResult) {
    return providerResult.automaticTimes.today != null && providerResult.automaticTimes.tomorrow != null;
}
export function applySuccessfulProviderSync(current, providerResult) {
    const nextValue = {
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
                await saveCurrent(nextValue);
                return nextValue;
            }
            catch (error) {
                logError("Aladhan prayer time sync failed.", error);
                throw error;
            }
        },
    };
}
