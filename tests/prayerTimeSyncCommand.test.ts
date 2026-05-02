import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VALID_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "icmg-tvapp",
  private_key_id: "testkey",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDtV78AIyRQjRtI\nWcZSDT7jz6rtHklF9g6FzJZ57e6W/e5w/zxMgkIvDQrQ1/lnA6mBA0hakEEAhX30\najvr7q12Qb/fproGlRLUKeJmN2G9bmlqcTZnBvK7+pj0HqinubZ/xutBN+UzFGAM\nULN3wp5Bkl/VViL56fDYVxO6FKrVWWX9wTOWolfKSSMcmpPQ1m2RgU9y6n6c4Sec\n8jZmyS5PKtxlaEDQ3b2Qmt2DvOQU7JF5ZoiVkacHn/8nmJKT9ErPn4KOIu2YRL3c\nXVlJJkFmaMIHyA5BnClPL4UGaN9ulrqNbXHP4jOKpCnquLzF2BnkFpPcRm5hIPfP\nKZmny2+TAgMBAAECggEAAoLLIn/nV8gmYb2RZjd9qCtU7kKZGS8L4vPRzmMWAxhB\n+DAQaJQi3xyO4LwS3Ll33EWMnmioR2PM0VPOY9CX792s31DZkaLsxWcsCKjNVT5g\ndHUo04OJ+Ih41cb9Qcj/2po1eEXUcZXlmOZsVPgEyezNLBSdNMekz0/HMFDHqI95\nrYnxayjrnJjhVrE0ddnmJP2l0z7ezz4o2Rfuolvj3jJdVveU0c99Mfz75JP6/sTO\n+tE1KK8wQJPIwCTxw9BCh64zJeGgPkqSu3NF0r3dd6Ovy/wV7a07GpfiU/yAeKqe\njEKH4iXbAzkhiXdBiyVQVjXS2fElHCjpkvTStb/jAQKBgQD4MB6WUp06jVCvbilR\nUA0SIUFLFSM4EpXYOm1dbKXWgGbwl48NK//PBvOo33zWxu9b0iKo3Bg5MYoZ9kNI\nNVOv5S5Bi/a2jEkswgX3Ps1wCNE3taq/JfCBUBiGXzWZX7jaFLKU7f5ZgMsypivz\n9KHLWkGffvSUwitvVBOBcZl0DwKBgQD00DyZaY5t6Jqw4qwoRFiezV94OJk5c8hS\nnU7LVMZ1j2r8DQQce+Q04nLRmnNo1+hhHVmLVWhYQt9AS8jFKq4ESqpNSUWF2Lo0\nS1L5a3JXNcf+oG9PcSZx6FM1WNzzaUt1j/ZhEARoaM9U1P7fj6owrvEdzg8/C/87\nPKmp+DC4PQKBgEmWuvsHc+cwj4P0vfuGKNn/UkTY96Bgol2CtXrGBEYdvGgKCDh3\nm1nfTc/8tB9azQ4EuJIo8GXE8pXQFxMJ/M5ivdxhi72Eyw2iWfJ9hJx7gM1r6DzV\nGwK8pQjyogngAAdpq6nNB2Wyco2KB+5F0tNg56RLGGojSI2x+DahYEaxAoGAFRkd\nH9uI+s/hBP2D+LRrLsRkRegazGi+CuCjucJEmD0T60Tz5cCHmkcpvgahi5eP3064\nONnTdEfPFatyUgurk5Mbui1mYHKdGYSkUfqAkCOCaN9KuH334jkzcpWF9TRN3IPb\np+HJf3YI6DazAHFRKYDqJrdrePN/u4su1Acfq8ECgYEApILq96NEzOwDKmFDeTsP\nZ0sOR8CsLRduVO2KhFwPwf/m3rWVRxByznhj3yIDHoaM7xP2sFC9bU9VgqT4DjBD\ny4vaGxbWL8SiDGNItOYnXF/xwsvi0Q4z+fXm5Ahv8Lr8sz1x5RY8AdcMLdzSHDTE\nuMA7/g/PJp18TZZYIJK0Cew=\n-----END PRIVATE KEY-----\n",
  client_email: "test@icmg-tvapp.iam.gserviceaccount.com",
  client_id: "123456789",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/test%40icmg-tvapp.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

test("syncPrayerTimes fails when FIREBASE_PROJECT_ID contains illegal database path characters", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "prayer-sync-test-"));
  const credPath = join(tmpDir, "service-account.json");
  writeFileSync(credPath, JSON.stringify(VALID_SERVICE_ACCOUNT));

  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/prayerTimes/syncPrayerTimes.ts",
        "--help",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credPath,
          FIREBASE_PROJECT_ID: "projects/icmg-tvapp/databases/(default)",
        },
      },
    );

    assert.equal(result.status, 0);
    assert.match(
      result.stdout,
      /Usage: npm run prayer-times:sync/,
    );
  } finally {
    try { unlinkSync(credPath); } catch { /* ignore */ }
    try { require("node:fs").rmdirSync(tmpDir); } catch { /* ignore */ }
  }
});

test("syncPrayerTimes accepts a plain project ID and logs debug env values before attempting sync", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "prayer-sync-test-"));
  const credPath = join(tmpDir, "service-account.json");
  writeFileSync(credPath, JSON.stringify(VALID_SERVICE_ACCOUNT));

  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/prayerTimes/syncPrayerTimes.ts",
        "--help",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credPath,
          FIREBASE_PROJECT_ID: "icmg-tvapp",
        },
      },
    );

    assert.equal(result.status, 0);
    const output = result.stdout + result.stderr;
    assert.match(output, /PROJECT_ID_ENV: icmg-tvapp/);
    assert.match(output, /GOOGLE_APPLICATION_CREDENTIALS:.*service-account\.json/);
  } finally {
    try { unlinkSync(credPath); } catch { /* ignore */ }
    try { require("node:fs").rmdirSync(tmpDir); } catch { /* ignore */ }
  }
});

test("syncPrayerTimes throws clear error when service account JSON is missing project_id", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "prayer-sync-test-"));
  const credPath = join(tmpDir, "service-account.json");
  writeFileSync(
    credPath,
    JSON.stringify({
      type: "service_account",
      client_email: "test@icmg-tvapp.iam.gserviceaccount.com",
      private_key: VALID_SERVICE_ACCOUNT.private_key,
    }),
  );

  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/prayerTimes/syncPrayerTimes.ts",
        "--help",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credPath,
          FIREBASE_PROJECT_ID: "icmg-tvapp",
        },
      },
    );

    assert.notEqual(result.status, 0);
    const output = result.stdout + result.stderr;
    assert.match(output, /project_id.*missing|missing.*project_id/i);
  } finally {
    try { unlinkSync(credPath); } catch { /* ignore */ }
    try { require("node:fs").rmdirSync(tmpDir); } catch { /* ignore */ }
  }
});

test("syncPrayerTimes throws clear error when service account JSON is missing client_email", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "prayer-sync-test-"));
  const credPath = join(tmpDir, "service-account.json");
  writeFileSync(
    credPath,
    JSON.stringify({
      type: "service_account",
      project_id: "icmg-tvapp",
      private_key: VALID_SERVICE_ACCOUNT.private_key,
    }),
  );

  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/prayerTimes/syncPrayerTimes.ts",
        "--help",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credPath,
        },
      },
    );

    assert.notEqual(result.status, 0);
    const output = result.stdout + result.stderr;
    assert.match(output, /client_email.*missing|missing.*client_email/i);
  } finally {
    try { unlinkSync(credPath); } catch { /* ignore */ }
    try { require("node:fs").rmdirSync(tmpDir); } catch { /* ignore */ }
  }
});

test("syncPrayerTimes throws clear error when service account JSON is missing private_key", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "prayer-sync-test-"));
  const credPath = join(tmpDir, "service-account.json");
  writeFileSync(
    credPath,
    JSON.stringify({
      type: "service_account",
      project_id: "icmg-tvapp",
      client_email: "test@icmg-tvapp.iam.gserviceaccount.com",
    }),
  );

  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/prayerTimes/syncPrayerTimes.ts",
        "--help",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credPath,
        },
      },
    );

    assert.notEqual(result.status, 0);
    const output = result.stdout + result.stderr;
    assert.match(output, /private_key.*missing|missing.*private_key/i);
  } finally {
    try { unlinkSync(credPath); } catch { /* ignore */ }
    try { require("node:fs").rmdirSync(tmpDir); } catch { /* ignore */ }
  }
});

test("syncPrayerTimes uses project_id from service account JSON, not FIREBASE_PROJECT_ID env", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "prayer-sync-test-"));
  const credPath = join(tmpDir, "service-account.json");
  writeFileSync(credPath, JSON.stringify(VALID_SERVICE_ACCOUNT));

  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/prayerTimes/syncPrayerTimes.ts",
        "--help",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credPath,
          FIREBASE_PROJECT_ID: "projects/icmg-tvapp/databases/(default)",
        },
      },
    );

    assert.equal(result.status, 0);
    const output = result.stdout + result.stderr;
    assert.match(output, /PROJECT_ID_ENV:.*projects\//);
    assert.match(output, /GOOGLE_APPLICATION_CREDENTIALS:.*service-account\.json/);
  } finally {
    try { unlinkSync(credPath); } catch { /* ignore */ }
    try { require("node:fs").rmdirSync(tmpDir); } catch { /* ignore */ }
  }
});