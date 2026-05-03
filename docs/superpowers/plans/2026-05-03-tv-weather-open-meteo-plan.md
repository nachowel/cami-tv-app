# TV Weather Open-Meteo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live localized weather to the TV display using Open-Meteo, with one fetch on load, a 30-minute refresh interval, and safe fallback behavior that preserves the last successful value.

**Architecture:** Keep weather entirely client-side. A dedicated weather service will normalize Open-Meteo responses into stable condition keys and icon tokens, while `TvDisplayLayout` owns the fetch lifecycle and passes presentational weather props into `ClockPanel`.

**Tech Stack:** TypeScript, React, browser `fetch`, existing i18n translation system, Node test runner

---

## File Structure

**Create**
- `src/services/weatherService.ts`
  - Fetch Open-Meteo data, map weather codes, and return normalized weather values.
- `src/components/tv/tvWeatherState.ts`
  - Own fallback creation and timed refresh orchestration for TV weather.
- `tests/weatherService.test.ts`
  - Weather code mapping and response normalization coverage.
- `tests/tvWeatherState.test.ts`
  - Fallback retention and refresh cadence coverage.

**Modify**
- `src/types/display.ts`
  - Add weather-specific types used by the TV display.
- `src/i18n/translations.ts`
  - Add localized weather translation keys.
- `src/components/tv/TvDisplayLayout.tsx`
  - Fetch weather once on load, refresh every 30 minutes, and pass weather props to `ClockPanel`.
- `src/components/tv/ClockPanel.tsx`
  - Replace the static weather slot with translated weather props while keeping styling unchanged.

## Task 1: Define Weather Types and Localization

**Files:**
- Modify: `src/types/display.ts`
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: Add the shared weather types**

Update `src/types/display.ts` with:

```ts
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

export interface TvWeather {
  temperatureC: number | null;
  condition: WeatherConditionKey;
  icon: string;
  isDay: boolean;
  fetchedAt: IsoDateTime | null;
}
```

- [ ] **Step 2: Add translation keys for both languages**

Update `src/i18n/translations.ts` to add:

```ts
weather_clear: "Clear",
weather_partly_cloudy: "Partly Cloudy",
weather_cloudy: "Cloudy",
weather_fog: "Fog",
weather_drizzle: "Drizzle",
weather_rain: "Rain",
weather_snow: "Snow",
weather_thunderstorm: "Thunderstorm",
weather_unknown: "Unknown",
weather_unavailable: "Weather unavailable",
```

and for Turkish:

```ts
weather_clear: "Açık",
weather_partly_cloudy: "Parçalı Bulutlu",
weather_cloudy: "Bulutlu",
weather_fog: "Sisli",
weather_drizzle: "Çiseleme",
weather_rain: "Yağmurlu",
weather_snow: "Karlı",
weather_thunderstorm: "Fırtına",
weather_unknown: "Bilinmiyor",
weather_unavailable: "Hava durumu alınamadı",
```

- [ ] **Step 3: Commit the type/i18n slice**

```bash
git add src/types/display.ts src/i18n/translations.ts
git commit -m "feat: add tv weather types and translations"
```

## Task 2: Build the Open-Meteo Service with Test-First Coverage

**Files:**
- Create: `src/services/weatherService.ts`
- Test: `tests/weatherService.test.ts`

- [ ] **Step 1: Write the failing weather service tests**

Create `tests/weatherService.test.ts`:

```ts
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
  const result = normalizeOpenMeteoCurrentWeather({
    current: {
      temperature_2m: 14.6,
      weather_code: 1,
      is_day: 1,
    },
  }, "2026-05-03T10:00:00.000Z");

  assert.deepEqual(result, {
    temperatureC: 15,
    condition: "weather_partly_cloudy",
    icon: "partly-cloudy-day",
    isDay: true,
    fetchedAt: "2026-05-03T10:00:00.000Z",
  });
});

test("createUnavailableTvWeather builds the localized fallback shape", () => {
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
```

- [ ] **Step 2: Run the weather service tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/weatherService.test.ts
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `src/services/weatherService.ts`

- [ ] **Step 3: Implement the weather service**

Create `src/services/weatherService.ts` with:

```ts
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
  if (code === 0) return "weather_clear";
  if (code === 1 || code === 2) return "weather_partly_cloudy";
  if (code === 3) return "weather_cloudy";
  if (code === 45 || code === 48) return "weather_fog";
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return "weather_drizzle";
  if (code === 61 || code === 63 || code === 65 || code === 66 || code === 67 || code === 80 || code === 81 || code === 82) return "weather_rain";
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return "weather_snow";
  if (code === 95 || code === 96 || code === 99) return "weather_thunderstorm";
  return "weather_unknown";
}

function getWeatherIcon(condition: WeatherConditionKey, isDay: boolean) {
  if (condition === "weather_clear") {
    return isDay ? "clear-day" : "clear-night";
  }
  if (condition === "weather_partly_cloudy") {
    return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
  }
  if (condition === "weather_cloudy") return "cloudy";
  if (condition === "weather_fog") return "fog";
  if (condition === "weather_drizzle") return "drizzle";
  if (condition === "weather_rain") return "rain";
  if (condition === "weather_snow") return "snow";
  if (condition === "weather_thunderstorm") return "thunderstorm";
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
```

- [ ] **Step 4: Run the weather service tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/weatherService.test.ts
```

Expected:
- all tests PASS

- [ ] **Step 5: Commit the service slice**

```bash
git add src/services/weatherService.ts tests/weatherService.test.ts
git commit -m "feat: add open-meteo tv weather service"
```

## Task 3: Add TV Weather State with 30-Minute Refresh and Last-Success Fallback

**Files:**
- Create: `src/components/tv/tvWeatherState.ts`
- Test: `tests/tvWeatherState.test.ts`

- [ ] **Step 1: Write the failing TV weather state tests**

Create `tests/tvWeatherState.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { createUnavailableTvWeather } from "../src/services/weatherService.ts";
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
    fetchWeather: async () => createUnavailableTvWeather(),
    onWeather() {},
    scheduleRefresh(retry, delayMs) {
      scheduledMs = delayMs;
      return () => {};
    },
  });

  controller.start();

  assert.equal(scheduledMs, TV_WEATHER_REFRESH_INTERVAL_MS);
});
```

- [ ] **Step 2: Run the TV weather state tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/tvWeatherState.test.ts
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `src/components/tv/tvWeatherState.ts`

- [ ] **Step 3: Implement the TV weather state controller**

Create `src/components/tv/tvWeatherState.ts` with:

```ts
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
    return () => globalThis.clearTimeout(timeoutId);
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
```

- [ ] **Step 4: Run the TV weather state tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/tvWeatherState.test.ts
```

Expected:
- all tests PASS

- [ ] **Step 5: Commit the state slice**

```bash
git add src/components/tv/tvWeatherState.ts tests/tvWeatherState.test.ts
git commit -m "feat: add tv weather refresh state"
```

## Task 4: Wire Weather into the TV Layout Without Changing Styling

**Files:**
- Modify: `src/components/tv/TvDisplayLayout.tsx`
- Modify: `src/components/tv/ClockPanel.tsx`

- [ ] **Step 1: Add weather props to `ClockPanel`**

Update `src/components/tv/ClockPanel.tsx` props:

```ts
import type { TvWeather } from "../../types/display.ts";

interface ClockPanelProps {
  language: DisplayLanguage;
  now: Date;
  nextPrayerName: PrayerName;
  countdownMs: number;
  weather: TvWeather;
}
```

Render weather using translations:

```tsx
<p className="mt-2 text-2xl font-bold leading-none 2xl:mt-4 2xl:text-4xl">
  {weather.temperatureC == null ? "--°C" : `${weather.temperatureC}°C`}
</p>
<p className="mt-1 text-sm font-medium leading-tight 2xl:text-2xl">
  {t(weather.condition)}
</p>
```

Use the service-provided icon token to choose a minimal glyph without changing layout:

```ts
function getWeatherGlyph(icon: string) {
  if (icon === "clear-day") return "☀";
  if (icon === "clear-night") return "☾";
  if (icon === "partly-cloudy-day" || icon === "partly-cloudy-night") return "⛅";
  if (icon === "cloudy") return "☁";
  if (icon === "fog") return "〰";
  if (icon === "drizzle" || icon === "rain") return "☂";
  if (icon === "snow") return "❄";
  if (icon === "thunderstorm") return "⚡";
  return "○";
}
```

- [ ] **Step 2: Add the weather controller to `TvDisplayLayout`**

Update `src/components/tv/TvDisplayLayout.tsx`:

```ts
import { useEffect, useState } from "react";
import type { DisplayData, TvWeather } from "../../types/display";
import { createUnavailableTvWeather } from "../../services/weatherService";
import { createTvWeatherController } from "./tvWeatherState";
```

Add local weather state:

```ts
const [weather, setWeather] = useState<TvWeather>(() => createUnavailableTvWeather());
```

Add a dedicated weather effect:

```ts
useEffect(() => {
  const controller = createTvWeatherController({
    onWeather: setWeather,
  });

  controller.start();

  return () => {
    controller.stop();
  };
}, []);
```

Pass weather into `ClockPanel`:

```tsx
<ClockPanel
  language={language}
  now={now}
  nextPrayerName={prayerMoment.nextPrayer.name}
  countdownMs={prayerMoment.countdownMs}
  weather={weather}
/>
```

- [ ] **Step 3: Commit the UI wiring slice**

```bash
git add src/components/tv/TvDisplayLayout.tsx src/components/tv/ClockPanel.tsx
git commit -m "feat: show live localized weather on tv display"
```

## Task 5: Full Verification

**Files:**
- Review only: `docs/superpowers/specs/2026-05-03-tv-weather-open-meteo-design.md`
- Review only: `docs/superpowers/plans/2026-05-03-tv-weather-open-meteo-plan.md`

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm run test:unit
```

Expected:
- all tests PASS

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected:
- successful TypeScript build with no errors

- [ ] **Step 3: Confirm the endpoint and refresh interval**

Verify:

```text
API endpoint:
https://api.open-meteo.com/v1/forecast?latitude=51.480938&longitude=0.181532&current=temperature_2m,weather_code,is_day&timezone=Europe%2FLondon

Refresh interval:
30 minutes
```

- [ ] **Step 4: Commit the final verified state**

```bash
git add .
git commit -m "feat: integrate open-meteo weather into tv display"
```

## Self-Review

### Spec coverage

- Stable condition keys: covered in Task 1 types and Task 2 mapping.
- Localization through `translations.ts`: covered in Task 1 and Task 4 rendering.
- `TvDisplayLayout`-owned fetch lifecycle: covered in Task 3 and Task 4.
- First-load fallback and last-success retention: covered in Task 3 tests and controller logic.
- 30-minute refresh instead of per-second refetch: covered in Task 3 cadence test.
- No layout redesign: Task 4 only replaces existing weather content.

### Placeholder scan

- No `TODO`, `TBD`, or vague “handle appropriately” steps remain.
- Commands and file paths are explicit.
- Code-changing steps include concrete code.

### Type consistency

- `TvWeather` is the single UI model passed into `ClockPanel`.
- `WeatherConditionKey` is the translation key contract between service and UI.
- Fallback uses `weather_unavailable` consistently across service, state, and UI.
