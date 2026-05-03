# TV Weather Open-Meteo Design

Date: 2026-05-03
Status: Approved for planning and implementation

## Goal

Add live weather to the TV display by fetching current conditions for the mosque location from Open-Meteo and rendering localized temperature and condition text in the existing clock/weather slot.

The TV must fetch weather client-side, keep the existing layout intact, and avoid coupling weather data to Firestore or the prayer sync pipeline.

## Non-Goals

- Do not redesign the TV layout.
- Do not add weather data to Firestore.
- Do not fetch weather every second with the clock timer.
- Do not hardcode weather condition labels inside `ClockPanel`.
- Do not return localized display text directly from the weather service.

## API Contract

Endpoint:

`https://api.open-meteo.com/v1/forecast?latitude=51.480938&longitude=0.181532&current=temperature_2m,weather_code,is_day&timezone=Europe%2FLondon`

Request behavior:

- no API key
- fetch from the TV client
- fetch on first TV load
- refresh every 30 minutes

Required response fields:

- `current.temperature_2m`
- `current.weather_code`
- `current.is_day`

## Internal Weather Model

The service must normalize the API response into a stable internal shape:

```ts
{
  temperatureC: number,
  condition: WeatherConditionKey,
  icon: string,
  isDay: boolean,
  fetchedAt: string
}
```

`condition` must be a stable translation key, not final display text.

Recommended condition key union:

```ts
type WeatherConditionKey =
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
```

## Weather Code Mapping

Open-Meteo weather codes must map into these normalized buckets:

- Clear
- Partly Cloudy
- Cloudy
- Fog
- Drizzle
- Rain
- Snow
- Thunderstorm
- Unknown

The mapping logic belongs in the weather service layer, not the UI.

`is_day` may influence the icon token, but not the localized text bucket.

## Localization

All user-facing condition labels must be translated through `src/i18n/translations.ts`.

English:

- `weather_clear`: `Clear`
- `weather_partly_cloudy`: `Partly Cloudy`
- `weather_cloudy`: `Cloudy`
- `weather_fog`: `Fog`
- `weather_drizzle`: `Drizzle`
- `weather_rain`: `Rain`
- `weather_snow`: `Snow`
- `weather_thunderstorm`: `Thunderstorm`
- `weather_unknown`: `Unknown`
- `weather_unavailable`: `Weather unavailable`

Turkish:

- `weather_clear`: `Açık`
- `weather_partly_cloudy`: `Parçalı Bulutlu`
- `weather_cloudy`: `Bulutlu`
- `weather_fog`: `Sisli`
- `weather_drizzle`: `Çiseleme`
- `weather_rain`: `Yağmurlu`
- `weather_snow`: `Karlı`
- `weather_thunderstorm`: `Fırtına`
- `weather_unknown`: `Bilinmiyor`
- `weather_unavailable`: `Hava durumu alınamadı`

## UI Ownership

### `TvDisplayLayout`

`TvDisplayLayout` owns the weather fetch lifecycle:

- fetch immediately on mount
- keep weather in local React state
- refresh every 30 minutes
- do not tie weather refresh to the 1-second clock interval
- keep last successful weather value on refresh failure

### `ClockPanel`

`ClockPanel` stays presentational:

- receives weather data via props
- translates `condition` via `t(condition)`
- renders fallback values without fetching

No weather network logic may be placed inside `ClockPanel`.

## Fallback and Failure Rules

If the first weather fetch fails and no prior success exists, the UI must show:

- temperature: `--°C`
- condition: localized `weather_unavailable`

If a later refresh fails after at least one successful fetch:

- keep the last successful weather state
- do not blank the display
- do not replace the last good condition with unavailable

## Icon Rules

The service should return a stable icon token or glyph string that the UI can render directly without layout changes.

This can remain simple:

- day clear: sun-like icon
- night clear: moon-like icon
- cloudy/fog/rain/snow/thunder buckets: stable icon strings

The important constraint is keeping the existing styling footprint and avoiding a layout redesign.

## Module Boundaries

### Weather service module

Create a weather-specific service module that:

- builds the fixed Open-Meteo URL
- fetches the response
- validates required fields
- maps weather code to stable `condition`
- derives a stable `icon`
- returns normalized weather data

### TV layout state module or hook

Create a focused state helper or hook that:

- initializes fallback weather state
- triggers immediate fetch
- schedules 30-minute refreshes
- keeps last successful state when a refresh fails

### Presentational UI

`ClockPanel` should only render provided props and translations.

## Testing Strategy

Required automated coverage:

1. weather code mapping buckets
2. service response normalization
3. localized fallback condition key path
4. refresh interval behavior does not refetch too often
5. failure after success preserves last weather state
6. first-load failure shows unavailable fallback state

## Risks and Constraints

- The codebase already updates clock state every second; weather refresh must remain separate.
- The service should be resilient to partial API shape changes and fail safely.
- Localization keys must stay consistent with the existing `useTranslation` flow.
- The UI must preserve the current panel size and alignment.

## Recommended Implementation Sequence

1. Add weather types and translation keys.
2. Add failing tests for mapping, normalization, fallback behavior, and refresh cadence.
3. Implement the Open-Meteo service and normalization helpers.
4. Implement TV layout weather state management.
5. Wire the weather props into `ClockPanel` without changing layout styling.
6. Run unit tests and typecheck.
