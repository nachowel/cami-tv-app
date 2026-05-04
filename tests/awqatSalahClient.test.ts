import test from "node:test";
import assert from "node:assert/strict";

import {
  createAwqatSalahClient,
  readAwqatSalahCredentialsFromEnv,
} from "../scripts/prayerTimes/awqatSalahClient.ts";

test("missing Awqat Salah username/password throws a safe error", () => {
  assert.throws(
    () =>
      readAwqatSalahCredentialsFromEnv({
        AWQAT_SALAH_PASSWORD: "",
        AWQAT_SALAH_USERNAME: "",
      }),
    /AWQAT_SALAH_USERNAME and AWQAT_SALAH_PASSWORD environment variables are required\./,
  );
});

test("failed Awqat Salah login throws a safe error without leaking secrets", async () => {
  const client = createAwqatSalahClient({
    fetchImpl: async () =>
      new Response(JSON.stringify({ message: "invalid credentials" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 401,
      }),
  });

  await assert.rejects(
    () =>
      client.login({
        password: "secret-password",
        username: "secret-user",
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Awqat Salah login failed with status 401\./);
      assert.doesNotMatch(error.message, /secret-user/);
      assert.doesNotMatch(error.message, /secret-password/);
      assert.doesNotMatch(error.message, /invalid credentials/);
      return true;
    },
  );
});

test("successful Awqat Salah login returns token flags without leaking secrets in logs", async () => {
  const client = createAwqatSalahClient({
    fetchImpl: async (_input, init) => {
      const body = typeof init?.body === "string" ? init.body : "";

      assert.match(body, /secret-user/);
      assert.match(body, /secret-password/);

      return new Response(
        JSON.stringify({
          accessToken: "access-secret-token",
          refreshToken: "refresh-secret-token",
          tokenType: "Bearer",
        }),
        {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        },
      );
    },
  });

  const result = await client.login({
    password: "secret-password",
    username: "secret-user",
  });

  assert.equal(result.hasAccessToken, true);
  assert.equal(result.hasRefreshToken, true);
  assert.equal(result.tokenType, "Bearer");
  assert.equal(result.accessToken, "access-secret-token");
  assert.equal(result.refreshToken, "refresh-secret-token");
});
