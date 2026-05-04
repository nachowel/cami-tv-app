const DEFAULT_AWQAT_SALAH_BASE_URL = "https://awqatsalah.diyanet.gov.tr";

export interface AwqatSalahCredentials {
  username: string;
  password: string;
}

export interface AwqatSalahPlace {
  id: number;
  code?: string;
  name: string;
}

export interface AwqatSalahCityDetail {
  city?: string;
  cityEn?: string;
  code?: string;
  country?: string;
  countryEn?: string;
  distanceToKaaba?: string;
  geographicQiblaAngle?: string;
  id: string;
  name?: string;
  qiblaAngle?: string;
}

export type AwqatSalahPrayerTimePayload = unknown;

export interface AwqatSalahLoginResult {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
}

export interface AwqatSalahClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface ParsedAwqatSalahTokens {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asRecord(value: unknown) {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : undefined;
}

function readNestedData(value: unknown): unknown {
  const record = asRecord(value);

  if (!record) {
    return value;
  }

  if ("data" in record) {
    return readNestedData(record.data);
  }

  return value;
}

function extractTokens(value: unknown): ParsedAwqatSalahTokens {
  const record = asRecord(readNestedData(value));

  if (!record) {
    return {};
  }

  const accessToken = isNonEmptyString(record.accessToken) ? record.accessToken : undefined;
  const refreshToken = isNonEmptyString(record.refreshToken) ? record.refreshToken : undefined;
  const tokenType = isNonEmptyString(record.tokenType) ? record.tokenType : undefined;

  if (accessToken || refreshToken || tokenType) {
    return { accessToken, refreshToken, tokenType };
  }
  return {};
}

function toSafeErrorMessage(error: unknown) {
  return error instanceof Error && isNonEmptyString(error.message)
    ? error.message
    : "Awqat Salah login smoke test failed.";
}

async function parseJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function normalizePlaceArray(path: string, value: unknown) {
  const data = readNestedData(value);

  if (!Array.isArray(data)) {
    throw new Error(`Awqat Salah request returned an unexpected response for ${path}.`);
  }

  return data.map((item) => {
    const record = asRecord(item);

    if (!record || typeof record.id !== "number" || !isNonEmptyString(record.name)) {
      throw new Error(`Awqat Salah request returned an unexpected response for ${path}.`);
    }

    return {
      code: isNonEmptyString(record.code) ? record.code : undefined,
      id: record.id,
      name: record.name.trim(),
    } satisfies AwqatSalahPlace;
  });
}

function normalizeCityDetail(path: string, value: unknown) {
  const data = readNestedData(value);
  const record = asRecord(data);

  if (!record || !(typeof record.id === "string" || typeof record.id === "number")) {
    throw new Error(`Awqat Salah request returned an unexpected response for ${path}.`);
  }

  return {
    city: isNonEmptyString(record.city) ? record.city : undefined,
    cityEn: isNonEmptyString(record.cityEn) ? record.cityEn : undefined,
    code: isNonEmptyString(record.code) ? record.code : undefined,
    country: isNonEmptyString(record.country) ? record.country : undefined,
    countryEn: isNonEmptyString(record.countryEn) ? record.countryEn : undefined,
    distanceToKaaba: isNonEmptyString(record.distanceToKaaba) ? record.distanceToKaaba : undefined,
    geographicQiblaAngle: isNonEmptyString(record.geographicQiblaAngle)
      ? record.geographicQiblaAngle
      : undefined,
    id: String(record.id),
    name: isNonEmptyString(record.name) ? record.name : undefined,
    qiblaAngle: isNonEmptyString(record.qiblaAngle) ? record.qiblaAngle : undefined,
  } satisfies AwqatSalahCityDetail;
}

function normalizePrayerTimePayload(path: string, value: unknown): AwqatSalahPrayerTimePayload {
  const data = readNestedData(value);

  if (data === undefined) {
    throw new Error(`Awqat Salah request returned an unexpected response for ${path}.`);
  }

  return data;
}

function validateCredentials(credentials: AwqatSalahCredentials) {
  if (!isNonEmptyString(credentials.username) || !isNonEmptyString(credentials.password)) {
    throw new Error(
      "AWQAT_SALAH_USERNAME and AWQAT_SALAH_PASSWORD environment variables are required.",
    );
  }

  return {
    username: credentials.username.trim(),
    password: credentials.password.trim(),
  };
}

export function readAwqatSalahCredentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AwqatSalahCredentials {
  return validateCredentials({
    username: env.AWQAT_SALAH_USERNAME ?? "",
    password: env.AWQAT_SALAH_PASSWORD ?? "",
  });
}

export function createAwqatSalahClient(options: AwqatSalahClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? DEFAULT_AWQAT_SALAH_BASE_URL).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  let accessToken = "";

  async function getAuthenticatedJson(path: string) {
    if (!accessToken) {
      throw new Error("Awqat Salah request requires a successful login first.");
    }

    let response: Response;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "GET",
      });
    } catch (error) {
      throw new Error(`Awqat Salah request failed for ${path}.`, { cause: error });
    }

    const responseBody = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(`Awqat Salah request failed for ${path} with status ${response.status}.`);
    }

    return responseBody;
  }

  async function getPrayerTimePayload(label: string, path: string) {
    try {
      const responseBody = await getAuthenticatedJson(path);
      console.log(`${label} fetch succeeded`);
      return normalizePrayerTimePayload(path, responseBody);
    } catch (error) {
      if (error instanceof Error) {
        const statusMatch = error.message.match(/status (\d+)\./);

        if (statusMatch) {
          console.log(`${label} fetch failed with status ${statusMatch[1]}`);
        }
      }

      throw error;
    }
  }

  return {
    async login(credentials: AwqatSalahCredentials): Promise<AwqatSalahLoginResult> {
      const validatedCredentials = validateCredentials(credentials);

      let response: Response;

      try {
        response = await fetchImpl(`${baseUrl}/Auth/Login`, {
          body: JSON.stringify({
            email: validatedCredentials.username,
            password: validatedCredentials.password,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
      } catch (error) {
        throw new Error("Awqat Salah login request failed.", { cause: error });
      }

      const responseBody = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(`Awqat Salah login failed with status ${response.status}.`);
      }

      const tokens = extractTokens(responseBody);

      if (!tokens.accessToken) {
        throw new Error("Awqat Salah login succeeded but no access token was returned.");
      }

      accessToken = tokens.accessToken;

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        hasAccessToken: true,
        hasRefreshToken: isNonEmptyString(tokens.refreshToken),
      };
    },
    async getCountries() {
      return normalizePlaceArray("/api/Place/Countries", await getAuthenticatedJson("/api/Place/Countries"));
    },
    async getStatesByCountry(countryId: number) {
      return normalizePlaceArray(
        `/api/Place/States/${countryId}`,
        await getAuthenticatedJson(`/api/Place/States/${countryId}`),
      );
    },
    async getCitiesByState(stateId: number) {
      return normalizePlaceArray(
        `/api/Place/Cities/${stateId}`,
        await getAuthenticatedJson(`/api/Place/Cities/${stateId}`),
      );
    },
    async getCityDetail(cityId: number) {
      return normalizeCityDetail(
        `/api/Place/CityDetail/${cityId}`,
        await getAuthenticatedJson(`/api/Place/CityDetail/${cityId}`),
      );
    },
    async getDailyPrayerTimes(cityId: number) {
      return getPrayerTimePayload("Daily", `/api/PrayerTime/Daily/${cityId}`);
    },
    async getWeeklyPrayerTimes(cityId: number) {
      return getPrayerTimePayload("Weekly", `/api/PrayerTime/Weekly/${cityId}`);
    },
    async getMonthlyPrayerTimes(cityId: number) {
      return getPrayerTimePayload("Monthly", `/api/PrayerTime/Monthly/${cityId}`);
    },
    toSafeErrorMessage,
  };
}

export { toSafeErrorMessage };
