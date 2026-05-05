export type ThemeMode = "auto" | "light" | "dark";

export type DisplayLanguage = "en" | "tr";

export type LocalizedText = Record<DisplayLanguage, string>;

export type DailyContentType = "ayah" | "hadith";

export type TickerType = "hadith" | "message";

export type PrayerTimeSource = "aladhan" | "manual" | "awqat-salah";
export type PrayerTimeSourceSetting = PrayerTimeSource;
export type PrayerTimeProviderAlias = "aladhan" | "awqat";
export type WeatherConditionKey =
  | "weather_clear"
  | "weather_partly_cloudy"
  | "weather_cloudy"
  | "weather_fog"
  | "weather_drizzle"
  | "weather_rain"
  | "weather_snow"
  | "weather_thunderstorm"
  | "weather_unknown"
  | "weather_unavailable";

export type IsoDate = `${number}-${number}-${number}`;

export type IsoDateTime = string;

export type Time24Hour = `${number}:${number}`;

export interface DisplaySettings {
  mosque_name: string;
  language: DisplayLanguage;
  theme_mode: ThemeMode;
  auto_theme_start: Time24Hour;
  auto_theme_end: Time24Hour;
  updated_at: IsoDateTime;
}

export interface DonationCurrent {
  weekly_amount: number;
  currency: "GBP";
  donation_url: string;
  updated_at: IsoDateTime;
}

export interface PrayerTimesForDay {
  fajr: Time24Hour;
  sunrise: Time24Hour;
  dhuhr: Time24Hour;
  asr: Time24Hour;
  maghrib: Time24Hour;
  isha: Time24Hour;
}

export interface PrayerTimeOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerTimesAutomaticSnapshot {
  date: IsoDate;
  today: PrayerTimesForDay;
  tomorrow: PrayerTimesForDay | null;
}

export interface PrayerTimesCurrent {
  date: IsoDate;
  today: PrayerTimesForDay;
  tomorrow: PrayerTimesForDay | null;
  updated_at: IsoDateTime;
  updatedAt?: IsoDateTime;
  effectiveSource: PrayerTimeSource;
  providerSource: Exclude<PrayerTimeSource, "manual"> | null;
  provider?: PrayerTimeProviderAlias | null;
  source?: PrayerTimeProviderAlias | null;
  method: number | null;
  fetchedAt: IsoDateTime | null;
  manualOverride: boolean;
  offsets: PrayerTimeOffsets;
  automaticTimes: PrayerTimesAutomaticSnapshot | null;
  validationStatus?: "valid";
}

export interface PrayerTimeSourceSettings {
  source: PrayerTimeSourceSetting;
  updatedAt: IsoDateTime | null;
  updatedBy?: string;
  cityId?: string;
  cityName?: string;
}

export interface DailyContentCurrent {
  arabic: string;
  translation: LocalizedText;
  source: string;
  type: DailyContentType;
  updated_at: IsoDateTime;
}

export interface Announcement {
  id: string;
  text: LocalizedText;
  active: boolean;
  expires_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface TickerCurrent {
  text: LocalizedText;
  type: TickerType;
  updated_at: IsoDateTime;
}

export interface DonationDisplayConfig {
  enabled: boolean;
  // Legacy fields (kept for backward compatibility)
  headline: string;
  message: string;
  cta: string;
  qrLabel: string;
  // New configurable fields
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  mainMessage: string;
  ctaText: string;
  qrUrl: string;
  backgroundImageUrl: string;
  impactText?: string;
  showImpactText: boolean;
  showQrCode: boolean;
  displayMode: "component" | "image";
  qrOverlayEnabled: boolean;
  qrOverlayXPercent: number;
  qrOverlayYPercent: number;
  qrOverlaySizePercent: number;
  motionEnabled: boolean;
}

export interface TvWeather {
  temperatureC: number | null;
  condition: WeatherConditionKey;
  icon: string;
  isDay: boolean;
  fetchedAt: IsoDateTime | null;
}

export interface DisplayData {
  settings: DisplaySettings;
  donation: DonationCurrent;
  prayerTimes: PrayerTimesCurrent;
  dailyContent: DailyContentCurrent;
  ticker: TickerCurrent;
  announcements: Announcement[];
}
