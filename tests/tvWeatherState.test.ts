import test from "node:test";
import assert from "node:assert/strict";

import { createTvWeatherController, TV_WEATHER_REFRESH_INTERVAL_MS } from "../src/components/tv/tvWeatherState.ts";

test("tv weather controller emits unavailable fallback when the first load fails", async () => {
  const values: string[] = [];

  const controller = createTvWeatherController({
    fetchWeather: async () => {
      throw new Error("offline");
    },
    onWeather(value) {
      values.push(value.condition);
    },
    scheduleRefresh() {
      return () => {};
    },
  });

  await controller.loadNow();

  assert.deepEqual(values, ["weather_unavailable"]);
});

test("tv weather controller keeps the last successful weather value when refresh fails", async () => {
  const emitted: string[] = [];
  let calls = 0;

  const controller = createTvWeatherController({
    fetchWeather: async () => {
      calls += 1;

      if (calls === 1) {
        return {
          temperatureC: 12,
          condition: "weather_clear",
          icon: "clear-day",
          isDay: true,
          fetchedAt: "2026-05-03T10:00:00.000Z",
        };
      }

      throw new Error("refresh-failed");
    },
    onWeather(value) {
      emitted.push(`${value.condition}:${value.temperatureC ?? "null"}`);
    },
    scheduleRefresh() {
      return () => {};
    },
  });

  await controller.loadNow();
  await controller.loadNow();

  assert.deepEqual(emitted, ["weather_clear:12", "weather_clear:12"]);
});

test("tv weather controller schedules refreshes every 30 minutes instead of every second", () => {
  let scheduledMs = -1;

  const controller = createTvWeatherController({
    fetchWeather: async () => ({
      temperatureC: null,
      condition: "weather_unavailable",
      icon: "weather-unavailable",
      isDay: true,
      fetchedAt: null,
    }),
    onWeather() {},
    scheduleRefresh(_retry, delayMs) {
      scheduledMs = delayMs;
      return () => {};
    },
  });

  controller.start();

  assert.equal(scheduledMs, TV_WEATHER_REFRESH_INTERVAL_MS);
});
