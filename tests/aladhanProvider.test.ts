import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPrayerTimeOffsets,
  createAladhanProvider,
  extractCleanTime,
  normalizeAladhanResponse,
} from "../scripts/prayerTimes/aladhanProvider.ts";

test("extractCleanTime strips timezone suffixes and annotations", () => {
  assert.equal(extractCleanTime("04:31 (+01)"), "04:31");
  assert.equal(extractCleanTime("18:47 (BST)"), "18:47");
  assert.equal(extractCleanTime("05:09"), "05:09");
});

test("applyPrayerTimeOffsets shifts each prayer by the configured minutes", () => {
  const result = applyPrayerTimeOffsets(
    {
      fajr: "04:30",
      sunrise: "05:15",
      dhuhr: "12:45",
      asr: "16:30",
      maghrib: "20:10",
      isha: "21:40",
    },
    {
      fajr: 2,
      sunrise: 0,
      dhuhr: -1,
      asr: 3,
      maghrib: 0,
      isha: -5,
    },
  );

  assert.deepEqual(result, {
    fajr: "04:32",
    sunrise: "05:15",
    dhuhr: "12:44",
    asr: "16:33",
    maghrib: "20:10",
    isha: "21:35",
  });
});

test("normalizeAladhanResponse maps provider data into the internal automatic snapshot", () => {
  const result = normalizeAladhanResponse({
    todayResponse: {
      data: {
        date: { gregorian: { date: "02-05-2026" } },
        timings: {
          Fajr: "04:31 (+01)",
          Sunrise: "05:17 (+01)",
          Dhuhr: "12:56 (+01)",
          Asr: "16:43 (+01)",
          Maghrib: "20:22 (+01)",
          Isha: "21:50 (+01)",
        },
      },
    },
    tomorrowResponse: {
      data: {
        date: { gregorian: { date: "03-05-2026" } },
        timings: {
          Fajr: "04:29 (+01)",
          Sunrise: "05:15 (+01)",
          Dhuhr: "12:56 (+01)",
          Asr: "16:44 (+01)",
          Maghrib: "20:24 (+01)",
          Isha: "21:52 (+01)",
        },
      },
    },
    fetchedAt: "2026-05-02T03:40:00.000Z",
    method: 13,
    offsets: {
      fajr: 0,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    },
  });

  assert.equal(result.providerSource, "aladhan");
  assert.equal(result.method, 13);
  assert.equal(result.fetchedAt, "2026-05-02T03:40:00.000Z");
  assert.equal(result.automaticTimes.date, "2026-05-02");
  assert.equal(result.automaticTimes.today.fajr, "04:31");
  assert.equal(result.automaticTimes.tomorrow?.maghrib, "20:24");
});

test("createAladhanProvider fetches today and tomorrow using timingsByCity with the configured city, country, and method", async () => {
  const urls: string[] = [];
  const provider = createAladhanProvider();

  const result = await provider.fetchAutomaticTimes(
    {
      city: "London",
      country: "United Kingdom",
      timezone: "Europe/London",
      method: 13,
    },
    {
      fajr: 0,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    },
    (async (input: string | URL | Request) => {
      const callNumber = urls.length + 1;
      urls.push(String(input));

      return {
        ok: true,
        json: async () => ({
          data: {
            date: {
              gregorian: {
                date: callNumber === 1 ? "02-05-2026" : "03-05-2026",
              },
            },
            timings: {
              Fajr: "04:31 (+01)",
              Sunrise: "05:17 (+01)",
              Dhuhr: "12:56 (+01)",
              Asr: "16:43 (+01)",
              Maghrib: "20:22 (+01)",
              Isha: "21:50 (+01)",
            },
          },
        }),
      } as Response;
    }) as typeof fetch,
    new Date("2026-05-02T12:00:00.000Z"),
  );

  assert.equal(urls.length, 2);
  assert.equal(urls[0]?.includes("/v1/timingsByCity/02-05-2026?"), true);
  assert.equal(urls[0]?.includes("city=London"), true);
  assert.equal(urls[0]?.includes("country=United+Kingdom"), true);
  assert.equal(urls[0]?.includes("method=13"), true);
  assert.equal(urls[1]?.includes("/v1/timingsByCity/03-05-2026?"), true);
  assert.equal(result.automaticTimes.date, "2026-05-02");
});
