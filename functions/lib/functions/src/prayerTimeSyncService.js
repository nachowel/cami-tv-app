import { createAladhanProvider } from "../../scripts/prayerTimes/aladhanProvider.js";
import { createPrayerTimeSyncRunner } from "../../scripts/prayerTimes/prayerTimeSyncShared.js";
import { FIRESTORE_PATHS } from "../../src/shared/firestorePaths.js";
function getTrimmedEnv(name, env) {
    const value = env[name]?.trim();
    return value ? value : null;
}
function readOffset(name, env) {
    const value = getTrimmedEnv(name, env);
    if (value == null) {
        return 0;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid numeric prayer time offset for ${name}: ${value}`);
    }
    return parsed;
}
export function getPrayerTimeSyncProjectId(env = process.env) {
    return getTrimmedEnv("FIREBASE_PROJECT_ID", env) ?? getTrimmedEnv("VITE_FIREBASE_PROJECT_ID", env);
}
export function readPrayerTimeSyncRuntimeOptions(env = process.env) {
    return {
        offsets: {
            fajr: readOffset("PRAYER_OFFSET_FAJR", env),
            sunrise: readOffset("PRAYER_OFFSET_SUNRISE", env),
            dhuhr: readOffset("PRAYER_OFFSET_DHUHR", env),
            asr: readOffset("PRAYER_OFFSET_ASR", env),
            maghrib: readOffset("PRAYER_OFFSET_MAGHRIB", env),
            isha: readOffset("PRAYER_OFFSET_ISHA", env),
        },
        providerConfig: {
            city: getTrimmedEnv("PRAYER_CITY", env) ?? "London",
            country: getTrimmedEnv("PRAYER_COUNTRY", env) ?? "United Kingdom",
            timezone: getTrimmedEnv("PRAYER_TIMEZONE", env) ?? "Europe/London",
            method: Number(getTrimmedEnv("PRAYER_METHOD", env) ?? "13"),
        },
    };
}
export async function runPrayerTimeSync({ db, fetchImpl, fetchProviderResult, logError = (message, error) => {
    console.error(message, error);
}, logInfo = (message) => {
    console.log(message);
}, now, offsets, providerConfig, targetPath = FIRESTORE_PATHS.prayerTimesCurrent, }) {
    const loadProviderResult = fetchProviderResult ??
        (() => {
            if (providerConfig == null || offsets == null) {
                throw new Error("providerConfig and offsets are required when fetchProviderResult is not supplied.");
            }
            return createAladhanProvider().fetchAutomaticTimes(providerConfig, offsets, fetchImpl, now);
        });
    const result = await createPrayerTimeSyncRunner({
        fetchCurrent: async () => {
            const snapshot = await db.doc(targetPath).get();
            return snapshot.exists ? snapshot.data() : null;
        },
        fetchProviderResult: loadProviderResult,
        saveCurrent: async (value) => {
            await db.doc(targetPath).set(value);
        },
        logError,
    }).run();
    logInfo(`Prayer times synced to ${targetPath} from ${result.providerSource ?? "unknown"} with effective source ${result.effectiveSource}.`);
    return result;
}
