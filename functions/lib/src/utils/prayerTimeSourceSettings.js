function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function readString(value) {
    return typeof value === "string" ? value : "";
}
function normalizeUpdatedAt(value) {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
    }
    if (isRecord(value) && typeof value.toDate === "function") {
        const date = value.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    return null;
}
export function createDefaultPrayerTimeSourceSettings() {
    return {
        cityId: undefined,
        cityName: undefined,
        source: "manual",
        updatedAt: null,
        updatedBy: undefined,
    };
}
function normalizeSource(value) {
    if (value === "aladhan") {
        return "aladhan";
    }
    if (value === "awqat" || value === "awqat-salah") {
        return "awqat-salah";
    }
    return "manual";
}
export function normalizePrayerTimeSourceSettings(value) {
    if (!isRecord(value)) {
        return createDefaultPrayerTimeSourceSettings();
    }
    return {
        cityId: readString(value.cityId) || undefined,
        cityName: readString(value.cityName) || undefined,
        source: normalizeSource(value.source),
        updatedAt: normalizeUpdatedAt(value.updatedAt),
        updatedBy: readString(value.updatedBy) || undefined,
    };
}
