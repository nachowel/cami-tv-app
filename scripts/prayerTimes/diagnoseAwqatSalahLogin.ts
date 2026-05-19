import { lookup as dnsLookup } from "node:dns/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  classifyAwqatLoginFailure,
  readAwqatSalahCredentialsFromEnv,
  sanitizeAwqatResponseHeaders,
  type AwqatSalahLoginFailureReason,
  type AwqatSalahCredentials,
} from "./awqatSalahClient.ts";

const DEFAULT_AWQAT_SALAH_BASE_URL = "https://awqatsalah.diyanet.gov.tr";
const DEFAULT_AWQAT_SALAH_USER_AGENT =
  "ICMG-Bexley-TV-Display/1.0 (+https://www.icmgbexley.org.uk)";
const DEFAULT_DIAGNOSTIC_ATTEMPTS = 3;
const DEFAULT_DIAGNOSTIC_BACKOFF_MS = 250;

interface LookupResult {
  address: string;
  family: number;
}

export interface AwqatSalahLoginConnectivityDiagnosticsOptions {
  baseUrl?: string;
  authenticatedPath?: string;
  attempts?: number;
  backoffMs?: number;
  credentials: AwqatSalahCredentials;
  fetchImpl?: typeof fetch;
  logInfo?: (message: string) => void;
  lookup?: (hostname: string) => Promise<LookupResult>;
  sleep?: (delayMs: number) => Promise<void>;
  userAgent?: string;
}

interface AuthMaterial {
  cookieHeader: string;
  hasCookie: boolean;
  hasToken: boolean;
  token: string;
}

interface AuthAttemptResult {
  retryable: boolean;
  terminalMessage: string;
}

function formatHeaders(headers: Headers) {
  const safeHeaders = sanitizeAwqatResponseHeaders(headers);
  const entries = Object.entries(safeHeaders);

  if (entries.length === 0) {
    return "none";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join("; ");
}

function getHostname(baseUrl: string) {
  return new URL(baseUrl).hostname;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readNestedData(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  if ("data" in value) {
    return readNestedData(value.data);
  }

  return value;
}

async function parseJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function extractAccessToken(value: unknown) {
  const record = readNestedData(value);

  if (!isRecord(record)) {
    return "";
  }

  return isNonEmptyString(record.accessToken) ? record.accessToken.trim() : "";
}

function getSetCookieHeaders(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const values = new Set(typeof withGetSetCookie.getSetCookie === "function"
    ? withGetSetCookie.getSetCookie()
    : []);
  const fallback = headers.get("set-cookie");

  if (fallback) {
    values.add(fallback);
  }

  return [...values];
}

function createCookieHeader(headers: Headers) {
  return getSetCookieHeaders(headers)
    .map((value) => value.split(";")[0]?.trim() ?? "")
    .filter(isNonEmptyString)
    .join("; ");
}

function isRetryable(reason: AwqatSalahLoginFailureReason) {
  return reason === "network reset" || reason === "timeout" || reason === "unexpected response";
}

function delay(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createAuthenticatedHeaders(authMaterial: AuthMaterial, userAgent: string) {
  const headers: Record<string, string> = {
    "User-Agent": userAgent,
  };

  if (authMaterial.hasToken) {
    headers.Authorization = `Bearer ${authMaterial.token}`;
  }

  if (authMaterial.hasCookie) {
    headers.Cookie = authMaterial.cookieHeader;
  }

  return headers;
}

async function runAuthFlowAttempt({
  attempt,
  authenticatedPath,
  credentials,
  fetchImpl,
  logInfo,
  normalizedBaseUrl,
  userAgent,
}: {
  attempt: number;
  authenticatedPath: string;
  credentials: AwqatSalahCredentials;
  fetchImpl: typeof fetch;
  logInfo: (message: string) => void;
  normalizedBaseUrl: string;
  userAgent: string;
}): Promise<AuthAttemptResult> {
  logInfo(`Auth flow attempt ${attempt}: credential POST`);

  let loginResponse: Response;

  try {
    loginResponse = await fetchImpl(`${normalizedBaseUrl}/Auth/Login`, {
      body: JSON.stringify({
        email: credentials.username,
        password: credentials.password,
      }),
      headers: {
        "content-type": "application/json",
        "User-Agent": userAgent,
      },
      method: "POST",
    });
  } catch (error) {
    const reason = classifyAwqatLoginFailure({ error });
    logInfo(`Login endpoint status: ${reason}`);
    logInfo(`Auth flow attempt ${attempt}: credential POST failed: ${reason}`);
    return {
      retryable: isRetryable(reason),
      terminalMessage: `credential POST failed: ${reason}`,
    };
  }

  const loginReason = classifyAwqatLoginFailure({ status: loginResponse.status });
  logInfo(`Login endpoint status: ${loginResponse.ok ? "ok" : loginReason}`);
  logInfo(`Response status code: ${loginResponse.status}`);
  logInfo(`Response headers: ${formatHeaders(loginResponse.headers)}`);

  if (!loginResponse.ok) {
    logInfo("Auth success: no");
    logInfo("Authenticated session valid: no");
    return {
      retryable: isRetryable(loginReason),
      terminalMessage: `credential POST failed: ${loginReason}`,
    };
  }

  const loginBody = await parseJsonSafely(loginResponse);
  const token = extractAccessToken(loginBody);
  const cookieHeader = createCookieHeader(loginResponse.headers);
  const authMaterial: AuthMaterial = {
    cookieHeader,
    hasCookie: cookieHeader.length > 0,
    hasToken: token.length > 0,
    token,
  };

  logInfo(`Auth token received: ${authMaterial.hasToken ? "yes" : "no"}`);
  logInfo(`Session cookie received: ${authMaterial.hasCookie ? "yes" : "no"}`);

  if (!authMaterial.hasToken && !authMaterial.hasCookie) {
    logInfo("Auth success: no");
    logInfo("Authenticated session valid: no");
    return {
      retryable: false,
      terminalMessage: "missing auth material",
    };
  }

  logInfo("Auth success: yes");

  try {
    const authenticatedResponse = await fetchImpl(`${normalizedBaseUrl}${authenticatedPath}`, {
      headers: createAuthenticatedHeaders(authMaterial, userAgent),
      method: "GET",
    });

    const authenticatedReason = classifyAwqatLoginFailure({ status: authenticatedResponse.status });
    logInfo(
      `Authenticated request: ${authenticatedResponse.ok ? "ok" : authenticatedReason} (status ${authenticatedResponse.status})`,
    );
    logInfo(`Authenticated response headers: ${formatHeaders(authenticatedResponse.headers)}`);
    logInfo(`Authenticated session valid: ${authenticatedResponse.ok ? "yes" : "no"}`);

    return {
      retryable: !authenticatedResponse.ok && isRetryable(authenticatedReason),
      terminalMessage: authenticatedResponse.ok
        ? "authenticated session valid"
        : `authenticated fetch failed: ${authenticatedReason}`,
    };
  } catch (error) {
    const reason = classifyAwqatLoginFailure({ error });
    logInfo(`Authenticated request: ${reason}`);
    logInfo(`Auth flow attempt ${attempt}: authenticated fetch failed: ${reason}`);
    logInfo("Authenticated session valid: no");
    return {
      retryable: isRetryable(reason),
      terminalMessage: `authenticated fetch failed: ${reason}`,
    };
  }
}

export async function runAwqatSalahLoginConnectivityDiagnostics({
  authenticatedPath = "/api/Place/Countries",
  attempts = DEFAULT_DIAGNOSTIC_ATTEMPTS,
  baseUrl = DEFAULT_AWQAT_SALAH_BASE_URL,
  backoffMs = DEFAULT_DIAGNOSTIC_BACKOFF_MS,
  credentials,
  fetchImpl = fetch,
  logInfo = console.log,
  lookup = dnsLookup,
  sleep = delay,
  userAgent = DEFAULT_AWQAT_SALAH_USER_AGENT,
}: AwqatSalahLoginConnectivityDiagnosticsOptions) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const hostname = getHostname(normalizedBaseUrl);
  const maxAttempts = Math.max(1, Math.floor(attempts));

  logInfo("[Awqat Salah Diagnostics] Starting login connectivity checks");
  logInfo(`Target host: ${hostname}`);

  try {
    const dnsResult = await lookup(hostname);
    logInfo(`DNS resolution: ok (${dnsResult.address}, IPv${dnsResult.family})`);
  } catch (error) {
    logInfo(`DNS resolution: failed (${classifyAwqatLoginFailure({ error })})`);
  }

  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/`, {
      headers: {
        "User-Agent": userAgent,
      },
      method: "GET",
    });
    logInfo(`HTTPS reachability: ${response.ok ? "ok" : "unexpected response"} (status ${response.status})`);
    logInfo(`HTTPS response headers: ${formatHeaders(response.headers)}`);
  } catch (error) {
    logInfo(`HTTPS reachability: ${classifyAwqatLoginFailure({ error })}`);
  }

  let finalMessage = "not attempted";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await runAuthFlowAttempt({
      attempt,
      authenticatedPath,
      credentials,
      fetchImpl,
      logInfo,
      normalizedBaseUrl,
      userAgent,
    });

    finalMessage = result.terminalMessage;

    if (finalMessage === "authenticated session valid" || !result.retryable || attempt >= maxAttempts) {
      break;
    }

    await sleep(Math.max(0, backoffMs) * 2 ** (attempt - 1));
  }

  logInfo(`Final auth flow result: ${finalMessage}`);
  logInfo("[Awqat Salah Diagnostics] Completed");
}

async function main() {
  const credentials = readAwqatSalahCredentialsFromEnv();
  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials,
  });
}

if (process.argv[1] != null && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unexpected Awqat Salah diagnostic error";
    console.error(`Awqat Salah diagnostic command failed: ${message}`);
    process.exitCode = 1;
  });
}
