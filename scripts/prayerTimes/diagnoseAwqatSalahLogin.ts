import { lookup as dnsLookup } from "node:dns/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  classifyAwqatLoginFailure,
  readAwqatSalahCredentialsFromEnv,
  sanitizeAwqatResponseHeaders,
  type AwqatSalahCredentials,
} from "./awqatSalahClient.ts";

const DEFAULT_AWQAT_SALAH_BASE_URL = "https://awqatsalah.diyanet.gov.tr";
const DEFAULT_AWQAT_SALAH_USER_AGENT =
  "ICMG-Bexley-TV-Display/1.0 (+https://www.icmgbexley.org.uk)";

interface LookupResult {
  address: string;
  family: number;
}

export interface AwqatSalahLoginConnectivityDiagnosticsOptions {
  baseUrl?: string;
  credentials: AwqatSalahCredentials;
  fetchImpl?: typeof fetch;
  logInfo?: (message: string) => void;
  lookup?: (hostname: string) => Promise<LookupResult>;
  userAgent?: string;
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

export async function runAwqatSalahLoginConnectivityDiagnostics({
  baseUrl = DEFAULT_AWQAT_SALAH_BASE_URL,
  credentials,
  fetchImpl = fetch,
  logInfo = console.log,
  lookup = dnsLookup,
  userAgent = DEFAULT_AWQAT_SALAH_USER_AGENT,
}: AwqatSalahLoginConnectivityDiagnosticsOptions) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const hostname = getHostname(normalizedBaseUrl);

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

  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/Auth/Login`, {
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
    const status = classifyAwqatLoginFailure({ status: response.status });
    logInfo(`Login endpoint status: ${response.ok ? "ok" : status}`);
    logInfo(`Response status code: ${response.status}`);
    logInfo(`Response headers: ${formatHeaders(response.headers)}`);
  } catch (error) {
    logInfo(`Login endpoint status: ${classifyAwqatLoginFailure({ error })}`);
  }

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
