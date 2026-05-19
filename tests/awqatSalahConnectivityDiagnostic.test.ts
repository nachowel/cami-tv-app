import test from "node:test";
import assert from "node:assert/strict";

import {
  runAwqatSalahLoginConnectivityDiagnostics,
} from "../scripts/prayerTimes/diagnoseAwqatSalahLogin.ts";

test("Awqat Salah login diagnostics logs DNS, HTTPS, login status, and sanitized headers", async () => {
  const logs: string[] = [];

  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials: {
      password: "secret-password",
      username: "secret-user",
    },
    fetchImpl: async (input, init) => {
      const url = String(input);

      if (url === "https://awqatsalah.diyanet.gov.tr/") {
        return new Response("", {
          headers: {
            "content-type": "text/html",
            "set-cookie": "session=secret-cookie",
          },
          status: 200,
        });
      }

      assert.equal(url, "https://awqatsalah.diyanet.gov.tr/Auth/Login");
      assert.match((init?.headers as Record<string, string>)["User-Agent"], /ICMG-Bexley-TV-Display/);

      return new Response(JSON.stringify({ message: "invalid credentials" }), {
        headers: {
          "content-type": "application/json",
          "x-request-id": "request-1",
        },
        status: 401,
      });
    },
    logInfo(message) {
      logs.push(message);
    },
    lookup: async () => ({
      address: "1.2.3.4",
      family: 4,
    }),
  });

  const output = logs.join("\n");
  assert.match(output, /DNS resolution: ok/);
  assert.match(output, /HTTPS reachability: ok/);
  assert.match(output, /Login endpoint status: auth failed/);
  assert.match(output, /Response status code: 401/);
  assert.match(output, /content-type: application\/json/);
  assert.match(output, /x-request-id: request-1/);
  assert.doesNotMatch(output, /secret-user|secret-password|secret-cookie|set-cookie/i);
});

test("Awqat Salah login diagnostics distinguishes timeout and network reset", async () => {
  const timeoutLogs: string[] = [];
  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials: {
      password: "secret-password",
      username: "secret-user",
    },
    fetchImpl: async (input) => {
      if (String(input) === "https://awqatsalah.diyanet.gov.tr/") {
        return new Response("", { status: 200 });
      }

      const error = new Error("operation timed out") as Error & { code?: string };
      error.code = "ETIMEDOUT";
      throw error;
    },
    logInfo(message) {
      timeoutLogs.push(message);
    },
    lookup: async () => ({ address: "1.2.3.4", family: 4 }),
  });

  assert.match(timeoutLogs.join("\n"), /Login endpoint status: timeout/);

  const resetLogs: string[] = [];
  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials: {
      password: "secret-password",
      username: "secret-user",
    },
    fetchImpl: async (input) => {
      if (String(input) === "https://awqatsalah.diyanet.gov.tr/") {
        return new Response("", { status: 200 });
      }

      const error = new Error("socket hang up") as Error & { code?: string };
      error.code = "ECONNRESET";
      throw error;
    },
    logInfo(message) {
      resetLogs.push(message);
    },
    lookup: async () => ({ address: "1.2.3.4", family: 4 }),
  });

  assert.match(resetLogs.join("\n"), /Login endpoint status: network reset/);
});

test("Awqat Salah login diagnostics verifies a successful authenticated follow-up request", async () => {
  const logs: string[] = [];
  const calls: Array<{ headers?: Record<string, string>; url: string }> = [];

  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials: {
      password: "secret-password",
      username: "secret-user",
    },
    fetchImpl: async (input, init) => {
      const url = String(input);
      calls.push({
        headers: init?.headers as Record<string, string> | undefined,
        url,
      });

      if (url === "https://awqatsalah.diyanet.gov.tr/") {
        return new Response("", { status: 200 });
      }

      if (url.endsWith("/Auth/Login")) {
        return new Response(
          JSON.stringify({
            data: {
              accessToken: "access-secret-token",
            },
          }),
          {
            headers: {
              "content-type": "application/json",
              "set-cookie": "session=secret-cookie; Path=/; HttpOnly",
            },
            status: 200,
          },
        );
      }

      assert.equal(url, "https://awqatsalah.diyanet.gov.tr/api/Place/Countries");
      assert.equal(calls.at(-1)?.headers?.Authorization, "Bearer access-secret-token");
      assert.equal(calls.at(-1)?.headers?.Cookie, "session=secret-cookie");

      return new Response(JSON.stringify({ data: [{ id: 1, name: "Country" }] }), {
        status: 200,
      });
    },
    logInfo(message) {
      logs.push(message);
    },
    lookup: async () => ({ address: "1.2.3.4", family: 4 }),
    sleep: async () => undefined,
  });

  const output = logs.join("\n");
  assert.match(output, /Auth flow attempt 1: credential POST/);
  assert.match(output, /Auth token received: yes/);
  assert.match(output, /Session cookie received: yes/);
  assert.match(output, /Auth success: yes/);
  assert.match(output, /Authenticated request: ok \(status 200\)/);
  assert.match(output, /Authenticated session valid: yes/);
  assert.doesNotMatch(output, /secret-user|secret-password|access-secret-token|secret-cookie|session=/);
});

test("Awqat Salah login diagnostics reports ECONNRESET during authenticated request and retries", async () => {
  const logs: string[] = [];
  let loginPosts = 0;
  let authenticatedGets = 0;

  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials: {
      password: "secret-password",
      username: "secret-user",
    },
    fetchImpl: async (input) => {
      const url = String(input);

      if (url === "https://awqatsalah.diyanet.gov.tr/") {
        return new Response("", { status: 200 });
      }

      if (url.endsWith("/Auth/Login")) {
        loginPosts += 1;
        return new Response(
          JSON.stringify({
            data: {
              accessToken: "access-secret-token",
            },
          }),
          { status: 200 },
        );
      }

      authenticatedGets += 1;
      const error = new Error("socket hang up") as Error & { code?: string };
      error.code = "ECONNRESET";
      throw error;
    },
    logInfo(message) {
      logs.push(message);
    },
    lookup: async () => ({ address: "1.2.3.4", family: 4 }),
    sleep: async () => undefined,
  });

  const output = logs.join("\n");
  assert.equal(loginPosts, 3);
  assert.equal(authenticatedGets, 3);
  assert.match(output, /Auth flow attempt 1: authenticated fetch failed: network reset/);
  assert.match(output, /Auth flow attempt 2: authenticated fetch failed: network reset/);
  assert.match(output, /Auth flow attempt 3: authenticated fetch failed: network reset/);
  assert.match(output, /Authenticated session valid: no/);
  assert.match(output, /Final auth flow result: authenticated fetch failed/);
  assert.doesNotMatch(output, /secret-user|secret-password|access-secret-token/);
});

test("Awqat Salah login diagnostics reports missing token and cookie session", async () => {
  const logs: string[] = [];
  let authenticatedGets = 0;

  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials: {
      password: "secret-password",
      username: "secret-user",
    },
    fetchImpl: async (input) => {
      const url = String(input);

      if (url === "https://awqatsalah.diyanet.gov.tr/") {
        return new Response("", { status: 200 });
      }

      if (url.endsWith("/Auth/Login")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      authenticatedGets += 1;
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    },
    logInfo(message) {
      logs.push(message);
    },
    lookup: async () => ({ address: "1.2.3.4", family: 4 }),
    sleep: async () => undefined,
  });

  const output = logs.join("\n");
  assert.equal(authenticatedGets, 0);
  assert.match(output, /Auth token received: no/);
  assert.match(output, /Session cookie received: no/);
  assert.match(output, /Auth success: no/);
  assert.match(output, /Authenticated session valid: no/);
  assert.match(output, /Final auth flow result: missing auth material/);
});

test("Awqat Salah login diagnostics logs retry attempts for transient login failures", async () => {
  const logs: string[] = [];
  let loginPosts = 0;

  await runAwqatSalahLoginConnectivityDiagnostics({
    credentials: {
      password: "secret-password",
      username: "secret-user",
    },
    fetchImpl: async (input) => {
      const url = String(input);

      if (url === "https://awqatsalah.diyanet.gov.tr/") {
        return new Response("", { status: 200 });
      }

      if (url.endsWith("/Auth/Login")) {
        loginPosts += 1;
        if (loginPosts < 3) {
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
      }

      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    },
    logInfo(message) {
      logs.push(message);
    },
    lookup: async () => ({ address: "1.2.3.4", family: 4 }),
    sleep: async () => undefined,
  });

  const output = logs.join("\n");
  assert.equal(loginPosts, 3);
  assert.match(output, /Auth flow attempt 1: credential POST failed: network reset/);
  assert.match(output, /Auth flow attempt 2: credential POST failed: network reset/);
  assert.match(output, /Auth flow attempt 3: credential POST/);
  assert.match(output, /Final auth flow result: authenticated session valid/);
});
