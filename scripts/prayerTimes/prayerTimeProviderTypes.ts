import type {
  PrayerTimeOffsets,
  PrayerTimesAutomaticSnapshot,
  PrayerTimesForDay,
} from "../../src/types/display.ts";

export interface PrayerTimeProviderConfig {
  city: string;
  country: string;
  timezone: string;
  method: number;
}

export interface PrayerTimeProviderResult {
  providerSource: "aladhan";
  method: number;
  fetchedAt: string;
  offsets: PrayerTimeOffsets;
  automaticTimes: PrayerTimesAutomaticSnapshot;
}

export interface PrayerTimeProvider {
  fetchAutomaticTimes: (
    config: PrayerTimeProviderConfig,
    offsets: PrayerTimeOffsets,
    fetchImpl?: typeof fetch,
    now?: Date,
  ) => Promise<PrayerTimeProviderResult>;
}

export type PrayerTimesDayRecord = PrayerTimesForDay;
