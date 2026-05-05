import { readPrayerTimeSyncRuntimeOptions, runPrayerTimeSync, } from "./prayerTimeSyncService.js";
export const SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE = "10 0 * * *";
export const SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE = "Europe/London";
export function createScheduledPrayerTimeSyncHandler({ db, readRuntimeOptions = readPrayerTimeSyncRuntimeOptions, runPrayerTimeSync: executePrayerTimeSync = runPrayerTimeSync, }) {
    return async () => {
        const runtimeOptions = readRuntimeOptions();
        await executePrayerTimeSync({
            db,
            logError(message, error) {
                console.error(message, error);
            },
            logInfo(message) {
                console.log(message);
            },
            offsets: runtimeOptions.offsets,
            providerConfig: runtimeOptions.providerConfig,
        });
    };
}
