import test from "node:test";
import assert from "node:assert/strict";

import {
  OPEN_METEO_TV_WEATHER_URL,
  createUnavailableTvWeather,
  mapOpenMeteoWeatherCode,
  normalizeOpenMeteoCurrentWeather,
} from "../src/services/weatherService.ts";

test("weather code mapping groups Open-Meteo codes into stable condition keys", () => {
  assert.equal(mapOpenMeteoWeatherCode(0), "weather_clear");
  assert.equal(mapOpenMeteoWeatherCode(1), "weather_partly_cloudy");
  assert.equal(mapOpenMeteoWeatherCode(3), "weather_cloudy");
  assert.equal(mapOpenMeteoWeatherCode(45), "weather_fog");
  assert.equal(mapOpenMeteoWeatherCode(53), "weather_drizzle");
  assert.equal(mapOpenMeteoWeatherCode(63), "weather_rain");
  assert.equal(mapOpenMeteoWeatherCode(71), "weather_snow");
  assert.equal(mapOpenMeteoWeatherCode(95), "weather_thunderstorm");
  assert.equal(mapOpenMeteoWeatherCode(999), "weather_unknown");
});

test("normalizeOpenMeteoCurrentWeather returns normalized weather data", () => {
  const result = normalizeOpenMeteoCurrentWeather(
    {
      current: {
        temperature_2m: 14.6,
        weather_code: 1,
        is_day: 1,
      },
    },
    "2026-05-03T10:00:00.000Z",
  );

  assert.deepEqual(result, {
    temperatureC: 15,
    condition: "weather_partly_cloudy",
    icon: "partly-cloudy-day",
    isDay: true,
    fetchedAt: "2026-05-03T10:00:00.000Z",
  });
});

test("createUnavailableTvWeather builds the fallback weather shape", () => {
  assert.deepEqual(createUnavailableTvWeather(), {
    temperatureC: null,
    condition: "weather_unavailable",
    icon: "weather-unavailable",
    isDay: true,
    fetchedAt: null,
  });
});

test("tv weather service uses the fixed Open-Meteo endpoint", () => {
  assert.equal(
    OPEN_METEO_TV_WEATHER_URL,
    "https://api.open-meteo.com/v1/forecast?latitude=51.480938&longitude=0.181532&current=temperature_2m,weather_code,is_day&timezone=Europe%2FLondon",
  );
});
