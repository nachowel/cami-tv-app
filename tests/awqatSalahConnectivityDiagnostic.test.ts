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
