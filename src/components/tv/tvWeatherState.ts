import type { TvWeather } from "../../types/display.ts";
import { createUnavailableTvWeather, fetchTvWeather } from "../../services/weatherService.ts";

export const TV_WEATHER_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

interface CreateTvWeatherControllerOptions {
  fetchWeather?: () => Promise<TvWeather>;
  onWeather: (value: TvWeather) => void;
  scheduleRefresh?: (retry: () => void, delayMs: number) => () => void;
}

export function createTvWeatherController({
  fetchWeather = () => fetchTvWeather(),
  onWeather,
  scheduleRefresh = (retry, delayMs) => {
    const timeoutId = globalThis.setTimeout(retry, delayMs);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  },
}: CreateTvWeatherControllerOptions) {
  let lastSuccessful = createUnavailableTvWeather();
  let hasSuccess = false;
  let cancelRefresh: (() => void) | null = null;
  let stopped = false;

  async function loadNow() {
    try {
      const nextValue = await fetchWeather();
      lastSuccessful = nextValue;
      hasSuccess = true;
      onWeather(nextValue);
    } catch {
      onWeather(hasSuccess ? lastSuccessful : createUnavailableTvWeather());
    }
  }

  function scheduleNext() {
    cancelRefresh?.();
    cancelRefresh = scheduleRefresh(async () => {
      if (stopped) {
        return;
      }

      await loadNow();
      scheduleNext();
    }, TV_WEATHER_REFRESH_INTERVAL_MS);
  }

  return {
    async loadNow() {
      await loadNow();
    },
    start() {
      void loadNow();
      scheduleNext();
    },
    stop() {
      stopped = true;
      cancelRefresh?.();
      cancelRefresh = null;
    },
  };
}
