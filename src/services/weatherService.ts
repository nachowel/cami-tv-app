import type { TvWeather, WeatherConditionKey } from "../types/display.ts";

export const OPEN_METEO_TV_WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=51.480938&longitude=0.181532&current=temperature_2m,weather_code,is_day&timezone=Europe%2FLondon";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createUnavailableTvWeather(): TvWeather {
  return {
    temperatureC: null,
    condition: "weather_unavailable",
    icon: "weather-unavailable",
    isDay: true,
    fetchedAt: null,
  };
}

export function mapOpenMeteoWeatherCode(code: number): WeatherConditionKey {
  if (code === 0) {
    return "weather_clear";
  }

  if (code === 1 || code === 2) {
    return "weather_partly_cloudy";
  }

  if (code === 3) {
    return "weather_cloudy";
  }

  if (code === 45 || code === 48) {
    return "weather_fog";
  }

  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
    return "weather_drizzle";
  }

  if (
    code === 61 ||
    code === 63 ||
    code === 65 ||
    code === 66 ||
    code === 67 ||
    code === 80 ||
    code === 81 ||
    code === 82
  ) {
    return "weather_rain";
  }

  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return "weather_snow";
  }

  if (code === 95 || code === 96 || code === 99) {
    return "weather_thunderstorm";
  }

  return "weather_unknown";
}

function getWeatherIcon(condition: WeatherConditionKey, isDay: boolean) {
  if (condition === "weather_clear") {
    return isDay ? "clear-day" : "clear-night";
  }

  if (condition === "weather_partly_cloudy") {
    return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
  }

  if (condition === "weather_cloudy") {
    return "cloudy";
  }

  if (condition === "weather_fog") {
    return "fog";
  }

  if (condition === "weather_drizzle") {
    return "drizzle";
  }

  if (condition === "weather_rain") {
    return "rain";
  }

  if (condition === "weather_snow") {
    return "snow";
  }

  if (condition === "weather_thunderstorm") {
    return "thunderstorm";
  }

  return "weather-unavailable";
}

export function normalizeOpenMeteoCurrentWeather(payload: unknown, fetchedAt: string): TvWeather {
  if (!isRecord(payload) || !isRecord(payload.current)) {
    throw new Error("Open-Meteo response must include a current object.");
  }

  const temperature = payload.current.temperature_2m;
  const weatherCode = payload.current.weather_code;
  const isDay = payload.current.is_day;

  if (typeof temperature !== "number" || !Number.isFinite(temperature)) {
    throw new Error("Open-Meteo current.temperature_2m must be a finite number.");
  }

  if (typeof weatherCode !== "number" || !Number.isFinite(weatherCode)) {
    throw new Error("Open-Meteo current.weather_code must be a finite number.");
  }

  if (isDay !== 0 && isDay !== 1) {
    throw new Error("Open-Meteo current.is_day must be 0 or 1.");
  }

  const condition = mapOpenMeteoWeatherCode(weatherCode);
  const isDayBoolean = isDay === 1;

  return {
    temperatureC: Math.round(temperature),
    condition,
    icon: getWeatherIcon(condition, isDayBoolean),
    isDay: isDayBoolean,
    fetchedAt,
  };
}

export async function fetchTvWeather(fetchImpl: typeof fetch = fetch): Promise<TvWeather> {
  const response = await fetchImpl(OPEN_METEO_TV_WEATHER_URL);

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return normalizeOpenMeteoCurrentWeather(payload, new Date().toISOString());
}
