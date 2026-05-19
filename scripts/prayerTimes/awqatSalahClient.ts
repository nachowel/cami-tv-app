const DEFAULT_AWQAT_SALAH_BASE_URL = "https://awqatsalah.diyanet.gov.tr";
const DEFAULT_AWQAT_SALAH_USER_AGENT =
  "ICMG-Bexley-TV-Display/1.0 (+https://www.icmgbexley.org.uk)";
const DEFAULT_AWQAT_LOGIN_ATTEMPTS = 3;
const DEFAULT_AWQAT_LOGIN_BACKOFF_MS = 250;

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

export type AwqatSalahLoginFailureReason =
  | "auth failed"
  | "blocked"
  | "network reset"
  | "timeout"
  | "unexpected response";

export interface AwqatSalahClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  logInfo?: (message: string) => void;
  loginAttempts?: number;
  loginBackoffMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  userAgent?: string;
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

function readErrorCode(error: unknown): string | undefined {
  const record = asRecord(error);
  const code = record?.code;

  if (isNonEmptyString(code)) {
    return code;
  }

  const cause = record?.cause;
  return cause === error ? undefined : readErrorCode(cause);
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isRetryableAwqatLoginFailure(reason: AwqatSalahLoginFailureReason) {
  return reason === "network reset" || reason === "timeout" || reason === "unexpected response";
}

export function classifyAwqatLoginFailure(input: {
  error?: unknown;
  status?: number;
}): AwqatSalahLoginFailureReason {
  if (typeof input.status === "number") {
    if (input.status === 401 || input.status === 400) {
      return "auth failed";
    }

    if (input.status === 403 || input.status === 429 || input.status === 451) {
      return "blocked";
    }

    return "unexpected response";
  }

  const code = readErrorCode(input.error)?.toUpperCase();
  const message = readErrorMessage(input.error).toLowerCase();

  if (code === "ECONNRESET" || message.includes("socket hang up") || message.includes("connection reset")) {
    return "network reset";
  }

  if (
    code === "ETIMEDOUT" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ABORT_ERR" ||
    message.includes("timed out") ||
    message.includes("timeout")
  ) {
    return "timeout";
  }

  if (code === "EACCES" || code === "EPERM" || message.includes("blocked") || message.includes("forbidden")) {
    return "blocked";
  }

  return "unexpected response";
}

export function sanitizeAwqatResponseHeaders(headers: Headers) {
  const safeHeaders: Record<string, string> = {};
  const excludedHeaders = new Set([
    "authorization",
    "cookie",
    "proxy-authorization",
    "set-cookie",
    "www-authenticate",
  ]);

  headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (!excludedHeaders.has(normalizedKey)) {
      safeHeaders[normalizedKey] = value;
    }
  });

  return safeHeaders;
}

function getSetCookieHeaders(headers: Headers) {
  const headersWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = new Set<string>();

  if (typeof headersWithGetSetCookie.getSetCookie === "function") {
    for (const value of headersWithGetSetCookie.getSetCookie()) {
      values.add(value);
    }
  }

  const fallbackValue = headers.get("set-cookie");

  if (fallbackValue) {
    values.add(fallbackValue);
  }

  return [...values];
}

function createCookieHeader(headers: Headers) {
  return getSetCookieHeaders(headers)
    .map((value) => value.split(";")[0]?.trim() ?? "")
    .filter(isNonEmptyString)
    .join("; ");
}

function createAuthenticatedHeaders(input: {
  accessToken: string;
  sessionCookieHeader: string;
  userAgent: string;
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.accessToken}`,
    "User-Agent": input.userAgent,
  };

  if (input.sessionCookieHeader) {
    headers.Cookie = input.sessionCookieHeader;
  }

  return headers;
}

function formatAwqatLoginFailureMessage(
  reason: AwqatSalahLoginFailureReason,
  attempts: number,
  status?: number,
) {
  const statusSuffix = typeof status === "number" ? ` (status ${status})` : "";
  return `Awqat Salah login failed: ${reason} after ${attempts} attempt${attempts === 1 ? "" : "s"}${statusSuffix}.`;
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
  const logInfo = options.logInfo ?? (() => undefined);
  const loginAttempts = Math.max(1, Math.floor(options.loginAttempts ?? DEFAULT_AWQAT_LOGIN_ATTEMPTS));
  const loginBackoffMs = Math.max(0, options.loginBackoffMs ?? DEFAULT_AWQAT_LOGIN_BACKOFF_MS);
  const sleepImpl = options.sleep ?? sleep;
  const userAgent = options.userAgent ?? DEFAULT_AWQAT_SALAH_USER_AGENT;
  let accessToken = "";
  let sessionCookieHeader = "";

  async function getAuthenticatedJson(path: string) {
    if (!accessToken) {
      throw new Error("Awqat Salah request requires a successful login first.");
    }

    let response: Response;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        headers: createAuthenticatedHeaders({
          accessToken,
          sessionCookieHeader,
          userAgent,
        }),
        method: "GET",
      });
    } catch (error) {
      const reason = classifyAwqatLoginFailure({ error });
      logInfo(`[Awqat Salah] authenticated fetch failed: ${reason} for ${path}`);
      throw new Error(`Awqat Salah request failed for ${path}.`, { cause: error });
    }

    const responseBody = await parseJsonSafely(response);
    logInfo(`[Awqat Salah] authenticated fetch status: ${response.status} for ${path}`);

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

      for (let attempt = 1; attempt <= loginAttempts; attempt += 1) {
        let response: Response;

        try {
          response = await fetchImpl(`${baseUrl}/Auth/Login`, {
            body: JSON.stringify({
              email: validatedCredentials.username,
              password: validatedCredentials.password,
            }),
            headers: {
              "content-type": "application/json",
              "User-Agent": userAgent,
            },
            method: "POST",
          });
        } catch (error) {
          const reason = classifyAwqatLoginFailure({ error });
          logInfo(`[Awqat Salah] login attempt ${attempt} failed: ${reason}`);

          if (attempt >= loginAttempts || !isRetryableAwqatLoginFailure(reason)) {
            throw new Error(formatAwqatLoginFailureMessage(reason, attempt), { cause: error });
          }

          await sleepImpl(loginBackoffMs * 2 ** (attempt - 1));
          continue;
        }

        const responseBody = await parseJsonSafely(response);

        if (!response.ok) {
          const reason = classifyAwqatLoginFailure({ status: response.status });
          logInfo(`[Awqat Salah] login attempt ${attempt} failed: ${reason} (status ${response.status})`);

          if (attempt >= loginAttempts || !isRetryableAwqatLoginFailure(reason)) {
            throw new Error(formatAwqatLoginFailureMessage(reason, attempt, response.status));
          }

          await sleepImpl(loginBackoffMs * 2 ** (attempt - 1));
          continue;
        }

        const tokens = extractTokens(responseBody);
        const cookieHeader = createCookieHeader(response.headers);

        logInfo(`[Awqat Salah] auth token received: ${tokens.accessToken ? "yes" : "no"}`);
        logInfo(`[Awqat Salah] session cookie received: ${cookieHeader ? "yes" : "no"}`);

        if (!tokens.accessToken) {
          const reason = "unexpected response";
          logInfo("[Awqat Salah] auth success: no");
          logInfo(`[Awqat Salah] login attempt ${attempt} failed: ${reason}`);

          if (attempt >= loginAttempts) {
            throw new Error(formatAwqatLoginFailureMessage(reason, attempt));
          }

          await sleepImpl(loginBackoffMs * 2 ** (attempt - 1));
          continue;
        }

        accessToken = tokens.accessToken;
        sessionCookieHeader = cookieHeader;
        logInfo("[Awqat Salah] auth success: yes");
        logInfo(`[Awqat Salah] login attempt ${attempt} succeeded`);

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType,
          hasAccessToken: true,
          hasRefreshToken: isNonEmptyString(tokens.refreshToken),
        };
      }

      throw new Error(formatAwqatLoginFailureMessage("unexpected response", loginAttempts));
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
