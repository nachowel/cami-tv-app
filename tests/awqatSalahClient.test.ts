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

test("authenticated Awqat Salah prayer time lookups use query-based endpoints and preserve the login token", async () => {
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
  assert.match(calls[1]?.input ?? "", /\/api\/AwqatSalah\/Daily\?cityId=14096$/);
  assert.match(calls[2]?.input ?? "", /\/api\/AwqatSalah\/Weekly\?cityId=14096$/);
  assert.match(calls[3]?.input ?? "", /\/api\/AwqatSalah\/Monthly\?cityId=14096$/);
  for (const call of calls.slice(1)) {
    assert.equal(
      (call.init?.headers as Record<string, string> | undefined)?.Authorization,
      "Bearer access-secret-token",
    );
  }
});

test("Awqat Salah prayer time lookup retries with CityId casing after a 404", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const client = createAwqatSalahClient({
    fetchImpl: async (input, init) => {
      const url = String(input);
      calls.push({
        init,
        input: url,
      });

      if (url.endsWith("/Auth/Login")) {
        return new Response(
          JSON.stringify({
            data: {
              accessToken: "access-secret-token",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      }

      if (url.endsWith("/api/AwqatSalah/Daily?cityId=14096")) {
        return new Response(JSON.stringify({ message: "not found" }), {
          headers: { "content-type": "application/json" },
          status: 404,
        });
      }

      if (url.endsWith("/api/AwqatSalah/Daily?CityId=14096")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                fajr: "04:10",
                gregorianDateShortIso8601: "2026-05-04",
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

      return new Response(JSON.stringify({ message: "unexpected" }), {
        headers: { "content-type": "application/json" },
        status: 500,
      });
    },
  });

  await client.login({
    password: "secret-password",
    username: "secret-user",
  });

  const daily = await client.getDailyPrayerTimes(14096);

  assert.equal(Array.isArray(daily), true);
  assert.match(calls[1]?.input ?? "", /\/api\/AwqatSalah\/Daily\?cityId=14096$/);
  assert.match(calls[2]?.input ?? "", /\/api\/AwqatSalah\/Daily\?CityId=14096$/);
  for (const call of calls.slice(1)) {
    assert.equal(
      (call.init?.headers as Record<string, string> | undefined)?.Authorization,
      "Bearer access-secret-token",
    );
  }
});
