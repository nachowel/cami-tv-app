import { createAwqatSalahClient, readAwqatSalahCredentialsFromEnv, } from "./awqatSalahClient.js";
import { createAladhanProvider } from "./aladhanProvider.js";
import { getAwqatGregorianIsoDate, mapAwqatToPrayerTimesDocument, } from "./awqatPrayerTimeMapper.js";
import { readPrayerTimeSyncRuntimeOptions, readPrayerTimeSourceSettings, } from "../../functions/src/prayerTimeSyncService.js";
import { FIRESTORE_PATHS } from "../../src/shared/firestorePaths.js";
import { describePrayerTimesForLog, validatePrayerTimesCurrent } from "./prayerTimesValidation.js";
import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.js";
import { applySuccessfulProviderSync } from "./prayerTimeSyncShared.js";
import { addIsoDateDays, getLondonIsoDate } from "../../src/utils/londonCalendar.js";
const LOCKED_CITY_ID = 14096;
const LOCKED_COUNTRY_ID = 15;
const LOCKED_PROVIDER_SOURCE = "awqat-salah";
class AwqatDateValidationError extends Error {
}
function getValidatedAwqatGregorianDate(value, label) {
    try {
        return getAwqatGregorianIsoDate(value);
    }
    catch {
        throw new AwqatDateValidationError(`Awqat ${label} Gregorian date is invalid.`);
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function toAwqatPrayerTimeDayInput(value, label) {
    if (!isRecord(value)) {
        throw new Error(`Awqat ${label} payload item must be an object.`);
    }
    const { fajr, sunrise, dhuhr, asr, maghrib, isha, gregorianDateLongIso8601, } = value;
    if (!isNonEmptyString(fajr) ||
        !isNonEmptyString(sunrise) ||
        !isNonEmptyString(dhuhr) ||
        !isNonEmptyString(asr) ||
        !isNonEmptyString(maghrib) ||
        !isNonEmptyString(isha) ||
        !isNonEmptyString(gregorianDateLongIso8601)) {
        throw new Error(`Awqat ${label} payload is missing required prayer time fields.`);
    }
    return {
        fajr,
        sunrise,
        dhuhr,
        asr,
        maghrib,
        isha,
        gregorianDateLongIso8601,
    };
}
function getSinglePrayerTimeRecord(payload, label) {
    if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error(`Awqat ${label} payload did not contain any records.`);
    }
    return toAwqatPrayerTimeDayInput(payload[0], label);
}
function getTomorrowPrayerTimeRecord(payload, expectedDate) {
    if (!Array.isArray(payload) || payload.length < 2) {
        throw new Error("Awqat weekly payload did not contain tomorrow's record.");
    }
    const records = payload.map((value, index) => toAwqatPrayerTimeDayInput(value, `weekly item ${index}`));
    const matchingRecord = records.find((record, index) => getValidatedAwqatGregorianDate(record.gregorianDateLongIso8601, `weekly item ${index}`) === expectedDate);
    if (matchingRecord) {
        return matchingRecord;
    }
    const receivedDate = records[1]
        ? getValidatedAwqatGregorianDate(records[1].gregorianDateLongIso8601, "tomorrow")
        : "missing";
    throw new AwqatDateValidationError(`Awqat tomorrow Gregorian date mismatch: expected ${expectedDate}, received ${receivedDate}.`);
}
function assertAwqatDate(record, expectedDate, label) {
    const receivedDate = getValidatedAwqatGregorianDate(record.gregorianDateLongIso8601, label);
    if (receivedDate !== expectedDate) {
        throw new AwqatDateValidationError(`Awqat ${label} Gregorian date mismatch: expected ${expectedDate}, received ${receivedDate}.`);
    }
}
export async function runProductionAwqatSalahSync({ db, env = process.env, fetchImpl, logError = (message, error) => {
    console.error(message, error);
}, logInfo = (message) => {
    console.log(message);
}, now, }) {
    const ref = db.doc(FIRESTORE_PATHS.prayerTimesCurrent);
    const executionTime = now ?? new Date();
    logInfo("[Awqat Salah Sync] Starting");
    logInfo(`  provider: ${LOCKED_PROVIDER_SOURCE}`);
    logInfo(`  cityId: ${LOCKED_CITY_ID}`);
    logInfo(`  countryId: ${LOCKED_COUNTRY_ID}`);
    const londonDateFormatter = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/London",
    });
    logInfo(`  executionLocalDate: ${londonDateFormatter.format(executionTime)} (Europe/London)`);
    logInfo(`  executionUtc: ${executionTime.toISOString()}`);
    logInfo(`  docPath: ${FIRESTORE_PATHS.prayerTimesCurrent}`);
    const prayerTimeSourceSettings = await readPrayerTimeSourceSettings(db);
    logInfo(`  configuredSource: ${prayerTimeSourceSettings.source}`);
    if (prayerTimeSourceSettings.source !== "awqat-salah") {
        logInfo(`[Awqat Salah Sync] Skipped: ${FIRESTORE_PATHS.settingsPrayerTimes} source is ${prayerTimeSourceSettings.source}`);
        logInfo(`  settingsPath: ${FIRESTORE_PATHS.settingsPrayerTimes}`);
        const snapshot = await ref.get();
        return normalizePrayerTimesCurrent(snapshot.exists ? snapshot.data() : null);
    }
    const currentSnapshot = await ref.get();
    const current = normalizePrayerTimesCurrent(currentSnapshot.exists ? currentSnapshot.data() : null);
    try {
        const credentials = readAwqatSalahCredentialsFromEnv(env);
        const client = createAwqatSalahClient({
            ...(fetchImpl ? { fetchImpl } : {}),
            logInfo,
        });
        await client.login(credentials);
        const dailyPayload = await client.getDailyPrayerTimes(LOCKED_CITY_ID);
        const weeklyPayload = await client.getWeeklyPrayerTimes(LOCKED_CITY_ID);
        const expectedTodayDate = getLondonIsoDate(executionTime);
        const expectedTomorrowDate = addIsoDateDays(expectedTodayDate, 1);
        const today = getSinglePrayerTimeRecord(dailyPayload, "daily");
        assertAwqatDate(today, expectedTodayDate, "daily");
        const tomorrow = getTomorrowPrayerTimeRecord(weeklyPayload, expectedTomorrowDate);
        const nextValue = mapAwqatToPrayerTimesDocument({
            current,
            today,
            tomorrow,
            fetchedAt: executionTime.toISOString(),
        });
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
        await ref.set(validatedValue);
        logInfo(describePrayerTimesForLog(validatedValue, "Europe/London", LOCKED_PROVIDER_SOURCE, FIRESTORE_PATHS.prayerTimesCurrent));
        logInfo("[Awqat Salah Sync] Completed successfully");
        logInfo(`  docPath: ${FIRESTORE_PATHS.prayerTimesCurrent}`);
        logInfo(`  source: ${LOCKED_PROVIDER_SOURCE}`);
        return validatedValue;
    }
    catch (error) {
        if (error instanceof AwqatDateValidationError) {
            logError("Awqat Salah date validation failed.", error);
            throw error;
        }
        logError("Awqat Salah fetch failed. Falling back to Aladhan.", error);
        const runtimeOptions = readPrayerTimeSyncRuntimeOptions(env);
        const providerResult = await createAladhanProvider().fetchAutomaticTimes(runtimeOptions.providerConfig, runtimeOptions.offsets, fetchImpl, executionTime);
        const fallbackValue = applySuccessfulProviderSync(current, providerResult);
        const validation = validatePrayerTimesCurrent(fallbackValue);
        if (!validation.valid) {
            const fallbackError = new Error(`Prayer times validation failed before Firestore write:\n  ${validation.errors.join("\n  ")}`);
            logError("Prayer times validation failed.", fallbackError);
            throw fallbackError;
        }
        const validatedValue = {
            ...fallbackValue,
            validationStatus: "valid",
        };
        await ref.set(validatedValue);
        logInfo(describePrayerTimesForLog(validatedValue, runtimeOptions.providerConfig.timezone, validatedValue.providerSource ?? "unknown", FIRESTORE_PATHS.prayerTimesCurrent));
        logInfo("[Awqat Salah Sync] Completed successfully with Aladhan fallback");
        logInfo(`  docPath: ${FIRESTORE_PATHS.prayerTimesCurrent}`);
        logInfo(`  source: ${validatedValue.providerSource ?? "unknown"}`);
        return validatedValue;
    }
}
