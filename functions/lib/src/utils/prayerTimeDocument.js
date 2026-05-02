const DEFAULT_DAY = {
    fajr: "00:00",
    sunrise: "00:00",
    dhuhr: "00:00",
    asr: "00:00",
    maghrib: "00:00",
    isha: "00:00",
};
const DEFAULT_OFFSETS = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
};
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function readString(value) {
    return typeof value === "string" ? value : "";
}
function toTime24Hour(value) {
    return value;
}
function readNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function normalizePrayerTimesForDay(value, fallback = DEFAULT_DAY) {
    const record = isRecord(value) ? value : {};
    return {
        fajr: toTime24Hour(readString(record.fajr) || fallback.fajr),
        sunrise: toTime24Hour(readString(record.sunrise) || fallback.sunrise),
        dhuhr: toTime24Hour(readString(record.dhuhr) || fallback.dhuhr),
        asr: toTime24Hour(readString(record.asr) || fallback.asr),
        maghrib: toTime24Hour(readString(record.maghrib) || fallback.maghrib),
        isha: toTime24Hour(readString(record.isha) || fallback.isha),
    };
}
function normalizeAutomaticSnapshot(value, fallbackDay, fallbackTomorrow) {
    if (!isRecord(value)) {
        return null;
    }
    return {
        date: (readString(value.date) || "1970-01-01"),
        today: normalizePrayerTimesForDay(value.today, fallbackDay),
        tomorrow: isRecord(value.tomorrow)
            ? normalizePrayerTimesForDay(value.tomorrow, fallbackTomorrow ?? fallbackDay)
            : null,
    };
}
export function normalizePrayerTimesCurrent(value, fallback) {
    const record = isRecord(value) ? value : {};
    const fallbackToday = fallback?.today ?? DEFAULT_DAY;
    const fallbackTomorrow = fallback?.tomorrow ?? null;
    const automaticTimes = normalizeAutomaticSnapshot(record.automaticTimes, fallbackToday, fallbackTomorrow);
    return {
        date: (readString(record.date) || fallback?.date || "1970-01-01"),
        today: normalizePrayerTimesForDay(record.today, fallbackToday),
        tomorrow: isRecord(record.tomorrow)
            ? normalizePrayerTimesForDay(record.tomorrow, fallbackTomorrow ?? fallbackToday)
            : fallbackTomorrow,
        updated_at: readString(record.updated_at) || fallback?.updated_at || new Date(0).toISOString(),
        effectiveSource: record.effectiveSource === "aladhan" ? "aladhan" : "manual",
        providerSource: record.providerSource === "aladhan" ? "aladhan" : null,
        method: typeof record.method === "number" ? record.method : null,
        fetchedAt: readString(record.fetchedAt) || null,
        manualOverride: typeof record.manualOverride === "boolean" ? record.manualOverride : true,
        offsets: {
            fajr: readNumber(isRecord(record.offsets) ? record.offsets.fajr : undefined, DEFAULT_OFFSETS.fajr),
            sunrise: readNumber(isRecord(record.offsets) ? record.offsets.sunrise : undefined, DEFAULT_OFFSETS.sunrise),
            dhuhr: readNumber(isRecord(record.offsets) ? record.offsets.dhuhr : undefined, DEFAULT_OFFSETS.dhuhr),
            asr: readNumber(isRecord(record.offsets) ? record.offsets.asr : undefined, DEFAULT_OFFSETS.asr),
            maghrib: readNumber(isRecord(record.offsets) ? record.offsets.maghrib : undefined, DEFAULT_OFFSETS.maghrib),
            isha: readNumber(isRecord(record.offsets) ? record.offsets.isha : undefined, DEFAULT_OFFSETS.isha),
        },
        automaticTimes,
    };
}
export function restoreEffectivePrayerTimesFromAutomatic(current, updatedAt) {
    if (!current.automaticTimes) {
        return {
            ...current,
            manualOverride: false,
        };
    }
    return {
        ...current,
        date: current.automaticTimes.date,
        today: current.automaticTimes.today,
        tomorrow: current.automaticTimes.tomorrow,
        updated_at: updatedAt,
        effectiveSource: "aladhan",
        manualOverride: false,
    };
}
