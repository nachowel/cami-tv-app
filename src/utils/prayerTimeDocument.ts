import type {
  PrayerTimeProviderAlias,
  PrayerTimeOffsets,
  PrayerTimesAutomaticSnapshot,
  PrayerTimesCurrent,
  PrayerTimesForDay,
  Time24Hour,
} from "../types/display.ts";

const DEFAULT_DAY: PrayerTimesForDay = {
  fajr: "00:00",
  sunrise: "00:00",
  dhuhr: "00:00",
  asr: "00:00",
  maghrib: "00:00",
  isha: "00:00",
};

const DEFAULT_OFFSETS: PrayerTimeOffsets = {
  fajr: 0,
  sunrise: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeProviderAlias(value: unknown): PrayerTimeProviderAlias | null {
  if (value === "aladhan") {
    return "aladhan";
  }

  if (value === "awqat" || value === "awqat-salah") {
    return "awqat";
  }

  return null;
}

function toCanonicalProviderSource(
  value: PrayerTimeProviderAlias | PrayerTimesCurrent["providerSource"],
): PrayerTimesCurrent["providerSource"] {
  if (value === "aladhan") {
    return "aladhan";
  }

  if (value === "awqat" || value === "awqat-salah") {
    return "awqat-salah";
  }

  return null;
}

export function toPrayerProviderAlias(
  value: PrayerTimeProviderAlias | PrayerTimesCurrent["providerSource"] | PrayerTimesCurrent["effectiveSource"] | null | undefined,
): PrayerTimeProviderAlias | null {
  return normalizeProviderAlias(value);
}

function normalizeEffectiveSource(
  value: unknown,
  sourceAlias: PrayerTimeProviderAlias | null,
): PrayerTimesCurrent["effectiveSource"] {
  if (value === "aladhan" || value === "awqat-salah") {
    return value;
  }

  if (sourceAlias === "aladhan") {
    return "aladhan";
  }

  if (sourceAlias === "awqat") {
    return "awqat-salah";
  }

  return "manual";
}

function normalizeProviderSource(
  value: unknown,
  providerAlias: PrayerTimeProviderAlias | null,
): PrayerTimesCurrent["providerSource"] {
  const canonical = toCanonicalProviderSource(value as PrayerTimeProviderAlias | PrayerTimesCurrent["providerSource"]);
  if (canonical != null) {
    return canonical;
  }

  return toCanonicalProviderSource(providerAlias);
}

export function getPrayerTimesUpdatedAt(value: Pick<PrayerTimesCurrent, "updatedAt" | "updated_at" | "fetchedAt">) {
  return value.updatedAt ?? value.updated_at ?? value.fetchedAt;
}

function resolvePreferredAutomaticSource(
  current: Pick<PrayerTimesCurrent, "providerSource" | "source">,
): Exclude<PrayerTimesCurrent["effectiveSource"], "manual"> {
  if (current.providerSource === "awqat-salah" || current.source === "awqat") {
    return "awqat-salah";
  }

  return "aladhan";
}

function toTime24Hour(value: string): Time24Hour {
  return value as Time24Hour;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePrayerTimesForDay(
  value: unknown,
  fallback: PrayerTimesForDay = DEFAULT_DAY,
): PrayerTimesForDay {
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

function normalizeAutomaticSnapshot(
  value: unknown,
  fallbackDay: PrayerTimesForDay,
  fallbackTomorrow: PrayerTimesForDay | null,
): PrayerTimesAutomaticSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    date: (readString(value.date) || "1970-01-01") as PrayerTimesAutomaticSnapshot["date"],
    today: normalizePrayerTimesForDay(value.today, fallbackDay),
    tomorrow: isRecord(value.tomorrow)
      ? normalizePrayerTimesForDay(value.tomorrow, fallbackTomorrow ?? fallbackDay)
      : null,
  };
}

export function normalizePrayerTimesCurrent(
  value: unknown,
  fallback?: PrayerTimesCurrent,
): PrayerTimesCurrent {
  const record = isRecord(value) ? value : {};
  const providerAlias = normalizeProviderAlias(record.provider ?? record.providerSource);
  const sourceAlias = normalizeProviderAlias(record.source ?? record.effectiveSource ?? record.provider);
  const fallbackToday = fallback?.today ?? DEFAULT_DAY;
  const fallbackTomorrow = fallback?.tomorrow ?? null;
  const automaticTimes = normalizeAutomaticSnapshot(
    record.automaticTimes,
    fallbackToday,
    fallbackTomorrow,
  );

  return {
    date: (readString(record.date) || fallback?.date || "1970-01-01") as PrayerTimesCurrent["date"],
    today: normalizePrayerTimesForDay(record.today, fallbackToday),
    tomorrow: isRecord(record.tomorrow)
      ? normalizePrayerTimesForDay(record.tomorrow, fallbackTomorrow ?? fallbackToday)
      : fallbackTomorrow,
    updated_at:
      readString(record.updated_at) ||
      readString(record.updatedAt) ||
      fallback?.updated_at ||
      fallback?.updatedAt ||
      new Date(0).toISOString(),
    updatedAt:
      readString(record.updatedAt) ||
      readString(record.updated_at) ||
      fallback?.updatedAt ||
      fallback?.updated_at ||
      new Date(0).toISOString(),
    effectiveSource: normalizeEffectiveSource(record.effectiveSource, sourceAlias),
    providerSource: normalizeProviderSource(record.providerSource, providerAlias),
    provider:
      providerAlias ??
      toPrayerProviderAlias(fallback?.providerSource ?? fallback?.provider) ??
      null,
    source:
      sourceAlias ??
      providerAlias ??
      toPrayerProviderAlias(fallback?.source ?? fallback?.providerSource ?? fallback?.provider) ??
      null,
    method: typeof record.method === "number" ? record.method : null,
    fetchedAt: readString(record.fetchedAt) || null,
    manualOverride: typeof record.manualOverride === "boolean" ? record.manualOverride : true,
    offsets: {
      fajr: readNumber(isRecord(record.offsets) ? record.offsets.fajr : undefined, DEFAULT_OFFSETS.fajr),
      sunrise: readNumber(
        isRecord(record.offsets) ? record.offsets.sunrise : undefined,
        DEFAULT_OFFSETS.sunrise,
      ),
      dhuhr: readNumber(isRecord(record.offsets) ? record.offsets.dhuhr : undefined, DEFAULT_OFFSETS.dhuhr),
      asr: readNumber(isRecord(record.offsets) ? record.offsets.asr : undefined, DEFAULT_OFFSETS.asr),
      maghrib: readNumber(
        isRecord(record.offsets) ? record.offsets.maghrib : undefined,
        DEFAULT_OFFSETS.maghrib,
      ),
      isha: readNumber(isRecord(record.offsets) ? record.offsets.isha : undefined, DEFAULT_OFFSETS.isha),
    },
    automaticTimes,
  };
}

export function restoreEffectivePrayerTimesFromAutomatic(
  current: PrayerTimesCurrent,
  updatedAt: string,
): PrayerTimesCurrent {
  if (!current.automaticTimes) {
    return {
      ...current,
      manualOverride: false,
    };
  }

  const restoredSource = resolvePreferredAutomaticSource(current);
  const providerAlias = toPrayerProviderAlias(restoredSource);

  return {
    ...current,
    date: current.automaticTimes.date,
    today: current.automaticTimes.today,
    tomorrow: current.automaticTimes.tomorrow,
    updated_at: updatedAt,
    updatedAt,
    effectiveSource: restoredSource,
    provider: providerAlias,
    source: providerAlias,
    manualOverride: false,
  };
}
