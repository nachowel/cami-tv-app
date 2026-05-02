import type {
  IsoDate,
  PrayerTimeOffsets,
  PrayerTimesForDay,
  Time24Hour,
} from "../../src/types/display.ts";
import type {
  PrayerTimeProvider,
  PrayerTimeProviderConfig,
  PrayerTimeProviderResult,
} from "./prayerTimeProviderTypes.ts";

interface AladhanTimingsResponse {
  data: {
    date: {
      gregorian: {
        date: string;
      };
    };
    timings: Record<string, string>;
  };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toTime24Hour(value: string) {
  return value as Time24Hour;
}

function toIsoDateValue(value: string) {
  return value as IsoDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function formatDateForTimezone(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    throw new Error(`Unable to format date for timezone: ${timezone}`);
  }

  return `${day}-${month}-${year}`;
}

function toIsoDate(gregorianDate: string) {
  const [day, month, year] = gregorianDate.split("-");
  return toIsoDateValue(`${year}-${month}-${day}`);
}

function shiftTime(value: string, offset: number) {
  const [hours, minutes] = value.split(":").map(Number);
  const totalMinutes = (hours * 60) + minutes + offset;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);

  return toTime24Hour(
    `${pad(Math.floor(normalizedMinutes / 60))}:${pad(normalizedMinutes % 60)}`,
  );
}

export function extractCleanTime(value: string) {
  const match = value.match(/^(\d{1,2}:\d{2})/);

  if (!match) {
    throw new Error(`Invalid Aladhan time: ${value}`);
  }

  const [hours, minutes] = match[1].split(":").map(Number);
  return toTime24Hour(`${pad(hours)}:${pad(minutes)}`);
}

export function applyPrayerTimeOffsets(
  times: PrayerTimesForDay,
  offsets: PrayerTimeOffsets,
): PrayerTimesForDay {
  return {
    fajr: shiftTime(times.fajr, offsets.fajr),
    sunrise: shiftTime(times.sunrise, offsets.sunrise),
    dhuhr: shiftTime(times.dhuhr, offsets.dhuhr),
    asr: shiftTime(times.asr, offsets.asr),
    maghrib: shiftTime(times.maghrib, offsets.maghrib),
    isha: shiftTime(times.isha, offsets.isha),
  };
}

function normalizeAladhanDay(timings: Record<string, string>) {
  return {
    fajr: extractCleanTime(timings.Fajr),
    sunrise: extractCleanTime(timings.Sunrise),
    dhuhr: extractCleanTime(timings.Dhuhr),
    asr: extractCleanTime(timings.Asr),
    maghrib: extractCleanTime(timings.Maghrib),
    isha: extractCleanTime(timings.Isha),
  };
}

export function normalizeAladhanResponse(input: {
  todayResponse: AladhanTimingsResponse;
  tomorrowResponse: AladhanTimingsResponse;
  fetchedAt: string;
  method: number;
  offsets: PrayerTimeOffsets;
}): PrayerTimeProviderResult {
  if (!input.todayResponse?.data?.timings || !input.tomorrowResponse?.data?.timings) {
    throw new Error("Aladhan provider requires complete today and tomorrow timing responses.");
  }

  const today = applyPrayerTimeOffsets(
    normalizeAladhanDay(input.todayResponse.data.timings),
    input.offsets,
  );
  const tomorrow = applyPrayerTimeOffsets(
    normalizeAladhanDay(input.tomorrowResponse.data.timings),
    input.offsets,
  );

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

async function fetchTimingsByCity(
  config: PrayerTimeProviderConfig,
  date: string,
  fetchImpl: typeof fetch,
) {
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

  return (await response.json()) as AladhanTimingsResponse;
}

export function createAladhanProvider(): PrayerTimeProvider {
  return {
    async fetchAutomaticTimes(
      config: PrayerTimeProviderConfig,
      offsets: PrayerTimeOffsets,
      fetchImpl: typeof fetch = fetch,
      now: Date = new Date(),
    ) {
      const todayDate = formatDateForTimezone(now, config.timezone);
      const tomorrowDate = formatDateForTimezone(addDays(now, 1), config.timezone);
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

export async function fetchAladhanAutomaticTimes(
  config: PrayerTimeProviderConfig,
  offsets: PrayerTimeOffsets,
  fetchImpl?: typeof fetch,
  now?: Date,
) {
  return createAladhanProvider().fetchAutomaticTimes(config, offsets, fetchImpl, now);
}
