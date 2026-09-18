import { toPrayerProviderAlias } from "../../src/utils/prayerTimeDocument.js";
function isValidTime24Hour(value) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}
function toTime24Hour(value, field) {
    if (!isValidTime24Hour(value)) {
        throw new Error(`Awqat prayer time field ${field} must use HH:MM format.`);
    }
    return value;
}
function normalizeAwqatPrayerTimesForDay(value) {
    return {
        fajr: toTime24Hour(value.fajr, "fajr"),
        sunrise: toTime24Hour(value.sunrise, "sunrise"),
        dhuhr: toTime24Hour(value.dhuhr, "dhuhr"),
        asr: toTime24Hour(value.asr, "asr"),
        maghrib: toTime24Hour(value.maghrib, "maghrib"),
        isha: toTime24Hour(value.isha, "isha"),
    };
}
export function getAwqatGregorianIsoDate(value) {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Awqat gregorianDateLongIso8601 must be a valid ISO datetime.");
    }
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (!match) {
        throw new Error("Awqat gregorianDateLongIso8601 must include a calendar date.");
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}
function normalizeAwqatAutomaticSnapshot(today, tomorrow) {
    return {
        date: getAwqatGregorianIsoDate(today.gregorianDateLongIso8601),
        today: normalizeAwqatPrayerTimesForDay(today),
        tomorrow: tomorrow ? normalizeAwqatPrayerTimesForDay(tomorrow) : null,
    };
}
export function mapAwqatToPrayerTimesDocument({ current, today, tomorrow, fetchedAt, }) {
    const automaticTimes = normalizeAwqatAutomaticSnapshot(today, tomorrow);
    const providerAlias = toPrayerProviderAlias("awqat-salah");
    const nextValue = {
        ...current,
        updatedAt: fetchedAt,
        providerSource: "awqat-salah",
        provider: providerAlias,
        source: providerAlias,
        method: null,
        fetchedAt,
        offsets: current.offsets,
        automaticTimes,
    };
    if (current.manualOverride) {
        return {
            ...nextValue,
            effectiveSource: "manual",
            manualOverride: true,
        };
    }
    return {
        ...nextValue,
        date: automaticTimes.date,
        today: automaticTimes.today,
        tomorrow: automaticTimes.tomorrow,
        updated_at: fetchedAt,
        effectiveSource: "awqat-salah",
        manualOverride: false,
    };
}
