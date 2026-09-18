import { readPrayerTimeSourceSettings, readPrayerTimeSyncRuntimeOptions, runPrayerTimeSync, } from "./prayerTimeSyncService.js";
import { runProductionAwqatSalahSync, } from "../../scripts/prayerTimes/syncAwqatSalahRuntime.js";
export const SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE = "10 0 * * *";
export const SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE = "Europe/London";
export function createScheduledPrayerTimeSyncHandler({ db, getAwqatCredentials = () => ({
    password: process.env.AWQAT_SALAH_PASSWORD ?? "",
    username: process.env.AWQAT_SALAH_USERNAME ?? "",
}), readPrayerTimeSourceSettings: readSourceSettings = readPrayerTimeSourceSettings, readRuntimeOptions = readPrayerTimeSyncRuntimeOptions, runAwqatSalahSync: executeAwqatSalahSync = runProductionAwqatSalahSync, runPrayerTimeSync: executePrayerTimeSync = runPrayerTimeSync, }) {
    return async () => {
        const logError = (message, error) => {
            console.error(message, error);
        };
        const logInfo = (message) => {
            console.log(message);
        };
        const sourceSettings = await readSourceSettings(db);
        if (sourceSettings.source === "awqat-salah") {
            const credentials = getAwqatCredentials();
            await executeAwqatSalahSync({
                db,
                env: {
                    ...process.env,
                    AWQAT_SALAH_PASSWORD: credentials.password,
                    AWQAT_SALAH_USERNAME: credentials.username,
                },
                logError,
                logInfo,
            });
            return;
        }
        const runtimeOptions = readRuntimeOptions();
        await executePrayerTimeSync({
            db,
            logError,
            logInfo,
            offsets: runtimeOptions.offsets,
            providerConfig: runtimeOptions.providerConfig,
        });
    };
}
