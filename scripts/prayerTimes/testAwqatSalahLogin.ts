import process from "node:process";

import {
  createAwqatSalahClient,
  readAwqatSalahCredentialsFromEnv,
  toSafeErrorMessage,
} from "./awqatSalahClient.ts";

type AwqatSalahSmokeTestMode =
  | "failure"
  | "success-with-refresh"
  | "success-without-refresh";

function createMockFetch(mode: AwqatSalahSmokeTestMode): typeof fetch {
  return (async () => {
    if (mode === "failure") {
      return new Response(
        JSON.stringify({
          message: "invalid credentials",
        }),
        {
          headers: {
            "content-type": "application/json",
          },
          status: 401,
        },
      );
    }

    return new Response(
      JSON.stringify({
        data: {
          accessToken: "access-secret-token",
          refreshToken: mode === "success-with-refresh" ? "refresh-secret-token" : undefined,
          tokenType: "Bearer",
        },
        success: true,
      }),
      {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      },
    );
  }) as typeof fetch;
}

function resolveFetchImplFromEnv(env: NodeJS.ProcessEnv) {
  const mode = env.AWQAT_SALAH_TEST_MODE;

  if (!mode) {
    return undefined;
  }

  if (
    mode !== "failure"
    && mode !== "success-with-refresh"
    && mode !== "success-without-refresh"
  ) {
    throw new Error(`Unsupported AWQAT_SALAH_TEST_MODE value: ${mode}.`);
  }

  return createMockFetch(mode);
}

async function main() {
  const credentials = readAwqatSalahCredentialsFromEnv();
  const fetchImpl = resolveFetchImplFromEnv(process.env);
  const client = createAwqatSalahClient(
    fetchImpl
      ? {
        fetchImpl,
      }
      : undefined,
  );
  const result = await client.login(credentials);

  console.log("Awqat Salah login succeeded");
  console.log(`Token received: ${result.hasAccessToken ? "yes" : "no"}`);
  console.log(`Refresh token received: ${result.hasRefreshToken ? "yes" : "no"}`);
}

try {
  await main();
} catch (error) {
  console.error(toSafeErrorMessage(error));
  process.exitCode = 1;
}
