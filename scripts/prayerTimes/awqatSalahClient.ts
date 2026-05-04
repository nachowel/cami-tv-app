const DEFAULT_AWQAT_SALAH_BASE_URL = "https://awqatsalah.diyanet.gov.tr";

export interface AwqatSalahCredentials {
  username: string;
  password: string;
}

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

function extractTokens(value: unknown): ParsedAwqatSalahTokens {
  const record = asRecord(value);

  if (!record) {
    return {};
  }

  const accessToken = isNonEmptyString(record.accessToken) ? record.accessToken : undefined;
  const refreshToken = isNonEmptyString(record.refreshToken) ? record.refreshToken : undefined;
  const tokenType = isNonEmptyString(record.tokenType) ? record.tokenType : undefined;

  if (accessToken || refreshToken || tokenType) {
    return { accessToken, refreshToken, tokenType };
  }

  if ("data" in record) {
    return extractTokens(record.data);
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

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        hasAccessToken: true,
        hasRefreshToken: isNonEmptyString(tokens.refreshToken),
      };
    },
    toSafeErrorMessage,
  };
}

export { toSafeErrorMessage };
