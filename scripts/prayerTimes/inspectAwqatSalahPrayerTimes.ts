import process from "node:process";

import {
  createAwqatSalahClient,
  readAwqatSalahCredentialsFromEnv,
  toSafeErrorMessage,
} from "./awqatSalahClient.ts";
import { summarizeAwqatPrayerTimePayload } from "./awqatSalahPrayerTimesInspection.ts";

const LOCKED_CITY_ID = 14096;
const LOCKED_CITY_NAME = "LONDRA";

type AwqatPrayerTimesInspectTestMode = "prayer-times-inspect";

function endsWithPrayerTimePath(url: string, scope: "Daily" | "Weekly" | "Monthly") {
  return url.endsWith(`/api/PrayerTime/${scope}/${LOCKED_CITY_ID}`);
}

function createMockFetch(mode: AwqatPrayerTimesInspectTestMode): typeof fetch {
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

    if (mode === "prayer-times-inspect" && endsWithPrayerTimePath(url, "Daily")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              asr: "16:45",
              dhuhr: "12:58",
              fajr: "04:12",
              gregorianDateShort: "04.05.2026",
              gregorianDateShortIso8601: "2026-05-04",
              hijriDateShort: "16.11.1447",
              isha: "21:41",
              maghrib: "20:18",
              shapeMoonUrl: "https://example.com/moon.png",
              sunrise: "05:24",
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

    if (mode === "prayer-times-inspect" && endsWithPrayerTimePath(url, "Monthly")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              asr: "16:45",
              dhuhr: "12:58",
              fajr: "04:12",
              gregorianDateShortIso8601: "2026-05-04",
              isha: "21:41",
              maghrib: "20:18",
              sunrise: "05:24",
            },
            {
              asr: "16:47",
              dhuhr: "12:58",
              fajr: "04:10",
              gregorianDateShortIso8601: "2026-05-05",
              isha: "21:43",
              maghrib: "20:19",
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

    if (mode === "prayer-times-inspect" && endsWithPrayerTimePath(url, "Weekly")) {
      return new Response(
        JSON.stringify({
          data: [],
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

  if (mode !== "prayer-times-inspect") {
    throw new Error(`Unsupported AWQAT_SALAH_TEST_MODE value: ${mode}.`);
  }

  return createMockFetch(mode);
}

function parseInspectArguments(argv: string[]) {
  return {
    includeMonthly: argv.includes("--monthly"),
  };
}

async function main() {
  const { includeMonthly } = parseInspectArguments(process.argv.slice(2));
  const credentials = readAwqatSalahCredentialsFromEnv();
  const fetchImpl = resolveFetchImplFromEnv(process.env);
  const client = createAwqatSalahClient(
    fetchImpl
      ? {
          fetchImpl,
        }
      : undefined,
  );

  await client.login(credentials);

  const daily = await client.getDailyPrayerTimes(LOCKED_CITY_ID);

  console.log("Awqat Salah prayer times inspection");
  console.log(`cityId: ${LOCKED_CITY_ID}`);
  console.log(`cityName: ${LOCKED_CITY_NAME}`);
  for (const line of summarizeAwqatPrayerTimePayload("Daily", daily)) {
    console.log(line);
  }

  if (!includeMonthly) {
    return;
  }

  const monthly = await client.getMonthlyPrayerTimes(LOCKED_CITY_ID);
  for (const line of summarizeAwqatPrayerTimePayload("Monthly", monthly)) {
    console.log(line);
  }
}

try {
  await main();
} catch (error) {
  console.error(toSafeErrorMessage(error));
  process.exitCode = 1;
}
