import process from "node:process";

import {
  createAwqatSalahClient,
  readAwqatSalahCredentialsFromEnv,
  toSafeErrorMessage,
  type AwqatSalahPlace,
} from "./awqatSalahClient.ts";
import {
  buildAwqatCityDiscoveryShortlist,
  matchAwqatCountryCandidates,
  type AwqatCityCandidate,
} from "./awqatSalahCityDiscovery.ts";

type AwqatCityDiscoveryTestMode =
  | "city-discovery-fallback-only"
  | "city-discovery-country-debug"
  | "city-discovery-london"
  | "city-discovery-no-country";

type AwqatCityDiscoveryDebugMode = "country-list";

function createMockFetch(mode: AwqatCityDiscoveryTestMode): typeof fetch {
  const countriesByMode: Record<AwqatCityDiscoveryTestMode, Array<Record<string, unknown>>> = {
    "city-discovery-country-debug": [
      { code: "TR", id: 1, name: "Türkiye" },
      { code: "GB", id: 2, name: "İngiltere" },
      { code: "DE", id: 3, name: "Almanya" },
    ],
    "city-discovery-fallback-only": [
      { code: "GB", id: 44, name: "United Kingdom" },
    ],
    "city-discovery-london": [
      { code: "GB", id: 44, name: "United Kingdom" },
      { code: "ENG", id: 46, name: "England" },
    ],
    "city-discovery-no-country": [
      { code: "TR", id: 90, name: "Turkiye" },
    ],
  };

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

    if (url.endsWith("/api/Place/Countries")) {
      return new Response(
        JSON.stringify({
          data: countriesByMode[mode],
          success: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }

    if (url.endsWith("/api/Place/States/44") || url.endsWith("/api/Place/States/46")) {
      return new Response(
        JSON.stringify({
          data: [
            { code: "LON", id: 10, name: "Greater London" },
            { code: "ENG-R", id: 55, name: "England Region" },
          ],
          success: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }

    if (url.endsWith("/api/Place/Cities/10")) {
      return new Response(
        JSON.stringify({
          data: mode === "city-discovery-fallback-only"
            ? []
            : [
                { code: "LON", id: 101, name: "London" },
                { code: "ELON", id: 301, name: "East London" },
                { code: "BEX", id: 501, name: "Bexley" },
              ],
          success: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }

    if (url.endsWith("/api/Place/Cities/55")) {
      return new Response(
        JSON.stringify({
          data: mode === "city-discovery-fallback-only"
            ? [
                { code: "MAN", id: 700, name: "Manchester" },
                { code: "LEE", id: 701, name: "Leeds" },
              ]
            : Array.from({ length: 11 }, (_, index) => ({
                code: `FB${index + 1}`,
                id: 800 + index,
                name: `Fallback ${index + 1}`,
              })),
          success: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }

    const cityDetailMatch = url.match(/\/api\/Place\/CityDetail\/(\d+)$/);

    if (cityDetailMatch) {
      const cityId = cityDetailMatch[1];
      return new Response(
        JSON.stringify({
          data: {
            city: cityId === "101" ? "London" : cityId === "501" ? "Bexley" : undefined,
            country: "United Kingdom",
            id: cityId,
            name: cityId === "101" ? "London" : cityId === "501" ? "Bexley" : `City ${cityId}`,
          },
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

  if (
    mode !== "city-discovery-country-debug"
    && mode !== "city-discovery-fallback-only"
    && mode !== "city-discovery-london"
    && mode !== "city-discovery-no-country"
  ) {
    throw new Error(`Unsupported AWQAT_SALAH_TEST_MODE value: ${mode}.`);
  }

  return createMockFetch(mode);
}

function resolveDebugModeFromEnv(env: NodeJS.ProcessEnv) {
  const mode = env.AWQAT_SALAH_DEBUG_MODE;

  if (!mode) {
    return null;
  }

  if (mode !== "country-list") {
    throw new Error(`Unsupported AWQAT_SALAH_DEBUG_MODE value: ${mode}.`);
  }

  return mode satisfies AwqatCityDiscoveryDebugMode;
}

function formatCountry(country: AwqatSalahPlace) {
  return [
    `countryId: ${country.id}`,
    `countryName: ${country.name}`,
  ].join("\n");
}

function formatCandidate(candidate: AwqatCityCandidate) {
  const detailName = candidate.detail?.cityEn ?? candidate.detail?.city ?? candidate.detail?.name;
  const lines = [
    `cityId: ${candidate.city.id}`,
    `cityName: ${candidate.city.name}`,
    `stateId: ${candidate.state?.id ?? "n/a"}`,
    `stateName: ${candidate.state?.name ?? "n/a"}`,
    `countryId: ${candidate.country.id}`,
    `countryName: ${candidate.country.name}`,
  ];

  if (detailName) {
    lines.push(`detailName: ${detailName}`);
  }

  return lines.join("\n");
}

async function attachCityDetails(
  client: ReturnType<typeof createAwqatSalahClient>,
  candidates: AwqatCityCandidate[],
) {
  return Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      detail: await client.getCityDetail(candidate.city.id),
    })),
  );
}

async function collectCandidates(
  client: ReturnType<typeof createAwqatSalahClient>,
  countries: AwqatSalahPlace[],
) {
  const candidates: AwqatCityCandidate[] = [];
  const seenCityIds = new Set<number>();

  for (const country of countries) {
    const states = await client.getStatesByCountry(country.id);

    for (const state of states) {
      const cities = await client.getCitiesByState(state.id);

      for (const city of cities) {
        if (seenCityIds.has(city.id)) {
          continue;
        }

        seenCityIds.add(city.id);
        candidates.push({
          city,
          country,
          state,
        });
      }
    }
  }

  return candidates;
}

async function main() {
  const credentials = readAwqatSalahCredentialsFromEnv();
  const fetchImpl = resolveFetchImplFromEnv(process.env);
  const debugMode = resolveDebugModeFromEnv(process.env);
  const client = createAwqatSalahClient(
    fetchImpl
      ? {
          fetchImpl,
        }
      : undefined,
  );

  await client.login(credentials);

  const countries = await client.getCountries();

  if (debugMode === "country-list") {
    console.log("DEBUG: Full country list");

    for (const country of countries) {
      console.log(formatCountry(country));
    }

    return;
  }

  const matchedCountries = matchAwqatCountryCandidates(countries);

  if (matchedCountries.length === 0) {
    throw new Error("No United Kingdom, UK, or England country candidate was found.");
  }

  const candidates = await collectCandidates(client, matchedCountries);
  const shortlist = buildAwqatCityDiscoveryShortlist(candidates, 10);
  const detailedBestMatch = shortlist.bestMatch
    ? (await attachCityDetails(client, [shortlist.bestMatch]))[0] ?? null
    : null;
  const detailedFallbacks = await attachCityDetails(client, shortlist.fallbackCandidates);

  console.log("Awqat Salah city discovery completed");
  console.log(`Matched countries: ${matchedCountries.map((country) => country.name).join(", ")}`);

  if (shortlist.preferredMatchFound && detailedBestMatch) {
    console.log("Best match:");
    console.log(formatCandidate(detailedBestMatch));
  } else {
    console.log("No London/Bexley candidate found.");
  }

  if (detailedFallbacks.length > 0) {
    console.log("Fallback candidates:");

    for (const candidate of detailedFallbacks) {
      console.log(formatCandidate(candidate));
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(toSafeErrorMessage(error));
  process.exitCode = 1;
}
