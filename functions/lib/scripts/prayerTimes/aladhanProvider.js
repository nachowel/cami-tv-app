import { addIsoDateDays, getIsoDateInTimeZone } from "../../src/utils/londonCalendar.js";
function pad(value) {
    return value.toString().padStart(2, "0");
}
function toTime24Hour(value) {
    return value;
}
function toIsoDateValue(value) {
    return value;
}
function formatIsoDateForProvider(isoDate) {
    const [year, month, day] = isoDate.split("-");
    return `${day}-${month}-${year}`;
}
function toIsoDate(gregorianDate) {
    const [day, month, year] = gregorianDate.split("-");
    return toIsoDateValue(`${year}-${month}-${day}`);
}
function shiftTime(value, offset) {
    const [hours, minutes] = value.split(":").map(Number);
    const totalMinutes = (hours * 60) + minutes + offset;
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    return toTime24Hour(`${pad(Math.floor(normalizedMinutes / 60))}:${pad(normalizedMinutes % 60)}`);
}
export function extractCleanTime(value) {
    const match = value.match(/^(\d{1,2}:\d{2})/);
    if (!match) {
        throw new Error(`Invalid Aladhan time: ${value}`);
    }
    const [hours, minutes] = match[1].split(":").map(Number);
    return toTime24Hour(`${pad(hours)}:${pad(minutes)}`);
}
export function applyPrayerTimeOffsets(times, offsets) {
    return {
        fajr: shiftTime(times.fajr, offsets.fajr),
        sunrise: shiftTime(times.sunrise, offsets.sunrise),
        dhuhr: shiftTime(times.dhuhr, offsets.dhuhr),
        asr: shiftTime(times.asr, offsets.asr),
        maghrib: shiftTime(times.maghrib, offsets.maghrib),
        isha: shiftTime(times.isha, offsets.isha),
    };
}
function normalizeAladhanDay(timings) {
    return {
        fajr: extractCleanTime(timings.Fajr),
        sunrise: extractCleanTime(timings.Sunrise),
        dhuhr: extractCleanTime(timings.Dhuhr),
        asr: extractCleanTime(timings.Asr),
        maghrib: extractCleanTime(timings.Maghrib),
        isha: extractCleanTime(timings.Isha),
    };
}
export function normalizeAladhanResponse(input) {
    if (!input.todayResponse?.data?.timings || !input.tomorrowResponse?.data?.timings) {
        throw new Error("Aladhan provider requires complete today and tomorrow timing responses.");
    }
    const today = applyPrayerTimeOffsets(normalizeAladhanDay(input.todayResponse.data.timings), input.offsets);
    const tomorrow = applyPrayerTimeOffsets(normalizeAladhanDay(input.tomorrowResponse.data.timings), input.offsets);
    return {
        providerSource: "aladhan",
        method: input.method,
        fetchedAt: input.fetchedAt,
        offsets: input.offsets,
        automaticTimes: {
            date: toIsoDate(input.todayResponse.data.date.gregorian.date),
            today,
            tomorrow,
        },
    };
}
async function fetchTimingsByCity(config, date, fetchImpl) {
    const query = new URLSearchParams({
        city: config.city,
        country: config.country,
        method: config.method.toString(),
    });
    const url = `https://api.aladhan.com/v1/timingsByCity/${date}?${query.toString()}`;
    const response = await fetchImpl(url);
    if (!response.ok) {
        throw new Error(`Aladhan request failed with status ${response.status} for ${date}`);
    }
    return (await response.json());
}
export function createAladhanProvider() {
    return {
        async fetchAutomaticTimes(config, offsets, fetchImpl = fetch, now = new Date()) {
            const todayIsoDate = getIsoDateInTimeZone(now, config.timezone);
            const tomorrowIsoDate = addIsoDateDays(todayIsoDate, 1);
            const todayDate = formatIsoDateForProvider(todayIsoDate);
            const tomorrowDate = formatIsoDateForProvider(tomorrowIsoDate);
            const [todayResponse, tomorrowResponse] = await Promise.all([
                fetchTimingsByCity(config, todayDate, fetchImpl),
                fetchTimingsByCity(config, tomorrowDate, fetchImpl),
            ]);
            return normalizeAladhanResponse({
                todayResponse,
                tomorrowResponse,
                fetchedAt: now.toISOString(),
                method: config.method,
                offsets,
            });
        },
    };
}
export async function fetchAladhanAutomaticTimes(config, offsets, fetchImpl, now) {
    return createAladhanProvider().fetchAutomaticTimes(config, offsets, fetchImpl, now);
}
