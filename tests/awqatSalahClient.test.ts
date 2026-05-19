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
      assert.match(error.message, /Awqat Salah login failed: auth failed after 1 attempt \(status 401\)\./);
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

test("Awqat Salah login sends a realistic user agent header", async () => {
  const client = createAwqatSalahClient({
    fetchImpl: async (_input, init) => {
      const headers = init?.headers as Record<string, string> | undefined;

      assert.match(headers?.["User-Agent"] ?? "", /ICMG-Bexley-TV-Display/);

      return new Response(
        JSON.stringify({
          data: {
            accessToken: "access-secret-token",
          },
        }),
        { status: 200 },
      );
    },
  });

  await client.login({
    password: "secret-password",
    username: "secret-user",
  });
});

test("Awqat Salah login retries network resets three times and logs sanitized attempt results", async () => {
  let calls = 0;
  const logs: string[] = [];
  const client = createAwqatSalahClient({
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) {
        const error = new Error("socket hang up") as Error & { code?: string };
        error.code = "ECONNRESET";
        throw error;
      }

      return new Response(
        JSON.stringify({
          data: {
            accessToken: "access-secret-token",
          },
        }),
        { status: 200 },
      );
    },
    logInfo(message) {
      logs.push(message);
    },
    sleep: async () => undefined,
  });

  await client.login({
    password: "secret-password",
    username: "secret-user",
  });

  assert.equal(calls, 3);
  assert.ok(logs.some((message) => /login attempt 1 failed: network reset/i.test(message)));
  assert.ok(logs.some((message) => /login attempt 2 failed: network reset/i.test(message)));
  assert.ok(logs.some((message) => /login attempt 3 succeeded/i.test(message)));
  assert.doesNotMatch(logs.join("\n"), /secret-user|secret-password|access-secret-token/);
});

test("Awqat Salah login reports auth failure clearly without retrying credentials", async () => {
  let calls = 0;
  const logs: string[] = [];
  const client = createAwqatSalahClient({
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: "invalid credentials" }), {
        status: 401,
      });
    },
    logInfo(message) {
      logs.push(message);
    },
    sleep: async () => undefined,
  });

  await assert.rejects(
    () =>
      client.login({
        password: "secret-password",
        username: "secret-user",
      }),
    /Awqat Salah login failed: auth failed/,
  );

  assert.equal(calls, 1);
  assert.ok(logs.some((message) => /login attempt 1 failed: auth failed/i.test(message)));
  assert.doesNotMatch(logs.join("\n"), /secret-user|secret-password|invalid credentials/);
});

test("Awqat Salah login reports blocked responses clearly", async () => {
  const logs: string[] = [];
  const client = createAwqatSalahClient({
    fetchImpl: async () => new Response("blocked", { status: 403 }),
    logInfo(message) {
      logs.push(message);
    },
    sleep: async () => undefined,
  });

  await assert.rejects(
    () =>
      client.login({
        password: "secret-password",
        username: "secret-user",
      }),
    /Awqat Salah login failed: blocked after 1 attempt \(status 403\)\./,
  );

  assert.ok(logs.some((message) => /login attempt 1 failed: blocked/i.test(message)));
  assert.doesNotMatch(logs.join("\n"), /secret-user|secret-password/);
});

test("Awqat Salah login reports unexpected successful responses without access tokens", async () => {
  const logs: string[] = [];
  const client = createAwqatSalahClient({
    fetchImpl: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    logInfo(message) {
      logs.push(message);
    },
    sleep: async () => undefined,
  });

  await assert.rejects(
    () =>
      client.login({
        password: "secret-password",
        username: "secret-user",
      }),
    /Awqat Salah login failed: unexpected response after 3 attempts\./,
  );

  assert.ok(logs.some((message) => /login attempt 3 failed: unexpected response/i.test(message)));
  assert.doesNotMatch(logs.join("\n"), /secret-user|secret-password/);
});

test("authenticated Awqat Salah place lookup uses the login token and returns place data", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const client = createAwqatSalahClient({
    fetchImpl: async (input, init) => {
      calls.push({
        init,
        input: String(input),
      });

      if (String(input).endsWith("/Auth/Login")) {
        return new Response(
          JSON.stringify({
            data: {
              accessToken: "access-secret-token",
              refreshToken: "refresh-secret-token",
              tokenType: "Bearer",
            },
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        );
      }

      return new Response(
        JSON.stringify({
          data: [
            {
              code: "GB",
              id: 44,
              name: "United Kingdom",
            },
          ],
          success: true,
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

  await client.login({
    password: "secret-password",
    username: "secret-user",
  });

  const countries = await client.getCountries();

  assert.deepEqual(countries, [
    {
      code: "GB",
      id: 44,
      name: "United Kingdom",
    },
  ]);
  assert.match(calls[1]?.input ?? "", /\/api\/Place\/Countries$/);
  assert.equal(
    (calls[1]?.init?.headers as Record<string, string> | undefined)?.Authorization,
    "Bearer access-secret-token",
  );
});

test("authenticated Awqat Salah prayer time lookups use official PrayerTime path endpoints and preserve the login token", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const client = createAwqatSalahClient({
    fetchImpl: async (input, init) => {
      calls.push({
        init,
        input: String(input),
      });

      if (String(input).endsWith("/Auth/Login")) {
        return new Response(
          JSON.stringify({
            data: {
              accessToken: "access-secret-token",
              refreshToken: "refresh-secret-token",
              tokenType: "Bearer",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      }

      return new Response(
        JSON.stringify({
          data: [
            {
              asr: "16:30",
              dhuhr: "12:45",
              fajr: "04:10",
              gregorianDateShortIso8601: "2026-05-04",
              isha: "21:45",
              maghrib: "20:15",
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
    },
  });

  await client.login({
    password: "secret-password",
    username: "secret-user",
  });

  const [daily, weekly, monthly] = await Promise.all([
    client.getDailyPrayerTimes(14096),
    client.getWeeklyPrayerTimes(14096),
    client.getMonthlyPrayerTimes(14096),
  ]);

  assert.equal(Array.isArray(daily), true);
  assert.equal(Array.isArray(weekly), true);
  assert.equal(Array.isArray(monthly), true);
  assert.match(calls[1]?.input ?? "", /\/api\/PrayerTime\/Daily\/14096$/);
  assert.match(calls[2]?.input ?? "", /\/api\/PrayerTime\/Weekly\/14096$/);
  assert.match(calls[3]?.input ?? "", /\/api\/PrayerTime\/Monthly\/14096$/);
  for (const call of calls.slice(1)) {
    assert.equal(
      (call.init?.headers as Record<string, string> | undefined)?.Authorization,
      "Bearer access-secret-token",
    );
  }
});
