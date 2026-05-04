import process from "node:process";

import { mockDisplayData } from "../../src/data/mockDisplayData.ts";
import type { PrayerTimesCurrent } from "../../src/types/display.ts";
import {
  createAwqatSalahClient,
  readAwqatSalahCredentialsFromEnv,
  toSafeErrorMessage,
} from "./awqatSalahClient.ts";
import {
  mapAwqatToPrayerTimesDocument,
  type AwqatPrayerTimeDayInput,
} from "./awqatPrayerTimeMapper.ts";

const LOCKED_CITY_ID = 14096;
const LOCKED_CITY_NAME = "LONDRA";
const LOCKED_COUNTRY_ID = 15;

type AwqatSyncDryRunTestMode = "sync-dry-run";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function endsWithPrayerTimePath(url: string, scope: "Daily" | "Monthly") {
  return url.endsWith(`/api/PrayerTime/${scope}/${LOCKED_CITY_ID}`);
}

function createMockFetch(mode: AwqatSyncDryRunTestMode): typeof fetch {
  return (async (input) => {
    const url = String(input);

    if (url.endsWith("/Auth/Login")) {
      return new Response(
        JSON.stringify({
          data: {
            accessToken: "access-secret-token",
            refreshToken: "refresh-secret-token",
            tokenType: "Bearer",
          },
          success: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }

    if (mode === "sync-dry-run" && endsWithPrayerTimePath(url, "Daily")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              asr: "17:10",
              dhuhr: "13:02",
              fajr: "03:28",
              gregorianDateLongIso8601: "2026-07-05T00:00:00+03:00",
              isha: "22:15",
              maghrib: "20:34",
              sunrise: "05:20",
            },
          ],
          success: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }

    if (mode === "sync-dry-run" && endsWithPrayerTimePath(url, "Monthly")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              asr: "17:10",
              dhuhr: "13:02",
              fajr: "03:28",
              gregorianDateLongIso8601: "2026-07-05T00:00:00+03:00",
              isha: "22:15",
              maghrib: "20:34",
              sunrise: "05:20",
            },
            {
              asr: "17:11",
              dhuhr: "13:02",
              fajr: "03:30",
              gregorianDateLongIso8601: "2026-07-06T00:00:00+03:00",
              isha: "22:13",
              maghrib: "20:33",
              sunrise: "05:22",
            },
          ],
          success: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }

    return new Response(JSON.stringify({ message: "not found" }), {
      headers: { "content-type": "application/json" },
      status: 404,
    });
  }) as typeof fetch;
}

function resolveFetchImplFromEnv(env: NodeJS.ProcessEnv) {
  const mode = env.AWQAT_SALAH_TEST_MODE;

  if (!mode) {
    return undefined;
  }

  if (mode !== "sync-dry-run") {
    throw new Error(`Unsupported AWQAT_SALAH_TEST_MODE value: ${mode}.`);
  }

  return createMockFetch(mode);
}

function toAwqatPrayerTimeDayInput(value: unknown, label: string): AwqatPrayerTimeDayInput {
  if (!isRecord(value)) {
    throw new Error(`Awqat ${label} payload item must be an object.`);
  }

  const {
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    gregorianDateLongIso8601,
  } = value;

  if (
    !isNonEmptyString(fajr) ||
    !isNonEmptyString(sunrise) ||
    !isNonEmptyString(dhuhr) ||
    !isNonEmptyString(asr) ||
    !isNonEmptyString(maghrib) ||
    !isNonEmptyString(isha) ||
    !isNonEmptyString(gregorianDateLongIso8601)
  ) {
    throw new Error(`Awqat ${label} payload is missing required prayer time fields.`);
  }

  return {
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    gregorianDateLongIso8601,
  };
}

function getSinglePrayerTimeRecord(payload: unknown, label: string) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error(`Awqat ${label} payload did not contain any records.`);
  }

  return toAwqatPrayerTimeDayInput(payload[0], label);
}

function nextIsoDate(date: string) {
  const next = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(next.getTime())) {
    throw new Error(`Awqat payload date ${date} is invalid.`);
  }

  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function extractIsoDate(value: AwqatPrayerTimeDayInput) {
  const match = value.gregorianDateLongIso8601.match(/^(\d{4}-\d{2}-\d{2})T/);

  if (!match) {
    throw new Error("Awqat gregorianDateLongIso8601 must include a calendar date.");
  }

  return match[1];
}

function findTomorrowFromMonthlyPayload(
  monthlyPayload: unknown,
  today: AwqatPrayerTimeDayInput,
): AwqatPrayerTimeDayInput | null {
  if (!Array.isArray(monthlyPayload)) {
    throw new Error("Awqat monthly payload must be an array.");
  }

  const expectedTomorrowDate = nextIsoDate(extractIsoDate(today));

  for (const item of monthlyPayload) {
    const normalized = toAwqatPrayerTimeDayInput(item, "monthly");
    if (extractIsoDate(normalized) === expectedTomorrowDate) {
      return normalized;
    }
  }

  return null;
}

function createDryRunCurrentSeed(): PrayerTimesCurrent {
  return {
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    automaticTimes: null,
  };
}

function printMappedOutput(mapped: PrayerTimesCurrent) {
  console.log("Awqat Salah sync dry-run");
  console.log(`countryId: ${LOCKED_COUNTRY_ID}`);
  console.log(`cityId: ${LOCKED_CITY_ID}`);
  console.log(`cityName: ${LOCKED_CITY_NAME}`);
  console.log(`date: ${mapped.date}`);
  console.log("today:");
  console.log(`  fajr: ${mapped.today.fajr}`);
  console.log(`  sunrise: ${mapped.today.sunrise}`);
  console.log(`  dhuhr: ${mapped.today.dhuhr}`);
  console.log(`  asr: ${mapped.today.asr}`);
  console.log(`  maghrib: ${mapped.today.maghrib}`);
  console.log(`  isha: ${mapped.today.isha}`);
  console.log(`providerSource: ${mapped.providerSource ?? "null"}`);
  console.log(`effectiveSource: ${mapped.effectiveSource}`);
  console.log(`manualOverride: ${String(mapped.manualOverride)}`);
  console.log("automaticTimes:");
  console.log(`  automaticDate: ${mapped.automaticTimes?.date ?? "null"}`);
  console.log(`  tomorrowAvailable: ${mapped.automaticTimes?.tomorrow ? "yes" : "no"}`);
  console.log(`  tomorrowFajr: ${mapped.automaticTimes?.tomorrow?.fajr ?? "null"}`);
}

async function main() {
  const credentials = readAwqatSalahCredentialsFromEnv();
  const fetchImpl = resolveFetchImplFromEnv(process.env);
  const client = createAwqatSalahClient(fetchImpl ? { fetchImpl } : undefined);

  await client.login(credentials);

  const dailyPayload = await client.getDailyPrayerTimes(LOCKED_CITY_ID);
  const today = getSinglePrayerTimeRecord(dailyPayload, "daily");

  let tomorrow: AwqatPrayerTimeDayInput | null = null;
  try {
    const monthlyPayload = await client.getMonthlyPrayerTimes(LOCKED_CITY_ID);
    tomorrow = findTomorrowFromMonthlyPayload(monthlyPayload, today);
  } catch {
    tomorrow = null;
  }

  const mapped = mapAwqatToPrayerTimesDocument({
    current: createDryRunCurrentSeed(),
    fetchedAt: new Date().toISOString(),
    today,
    tomorrow,
  });

  printMappedOutput(mapped);
}

try {
  await main();
} catch (error) {
  console.error(toSafeErrorMessage(error));
  process.exitCode = 1;
}
