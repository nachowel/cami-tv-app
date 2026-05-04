import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAwqatCityDiscoveryShortlist,
  matchAwqatCountryCandidates,
  type AwqatCityCandidate,
} from "../scripts/prayerTimes/awqatSalahCityDiscovery.ts";

test("country matching handles United Kingdom, UK, and England variants", () => {
  const result = matchAwqatCountryCandidates([
    { code: "TR", id: 90, name: "Turkiye" },
    { code: "GB", id: 44, name: "United Kingdom" },
    { code: "UK", id: 45, name: "UK" },
    { code: "GBR", id: 47, name: "Great Britain" },
    { code: "ENG", id: 46, name: "England" },
  ]);

  assert.deepEqual(result.map((country) => country.name), [
    "United Kingdom",
    "Great Britain",
    "UK",
    "England",
  ]);
});

test("country matching includes real Diyanet countryId 15 for INGILTERE variants", () => {
  const result = matchAwqatCountryCandidates([
    { code: "TR", id: 90, name: "Turkiye" },
    { code: "GB", id: 15, name: "INGILTERE" },
    { code: "GB2", id: 16, name: "İNGİLTERE" },
    { code: "GB3", id: 17, name: "INGILIZTERE" },
  ]);

  assert.equal(result[0]?.id, 15);
  assert.deepEqual(result.map((country) => country.id), [15, 16, 17]);
});

test("city discovery shortlist ranks exact London first, then London contains, then Bexley, then fallback candidates", () => {
  const candidates: AwqatCityCandidate[] = [
    {
      city: { id: 501, name: "Bexley" },
      country: { id: 44, name: "United Kingdom" },
      state: { id: 10, name: "Greater London" },
    },
    {
      city: { id: 101, name: "London" },
      country: { id: 44, name: "United Kingdom" },
      state: { id: 10, name: "Greater London" },
    },
    {
      city: { id: 201, name: "North London" },
      country: { id: 44, name: "United Kingdom" },
      state: { id: 10, name: "Greater London" },
    },
    {
      city: { id: 301, name: "East London" },
      country: { id: 44, name: "United Kingdom" },
      state: { id: 10, name: "Greater London" },
    },
    ...Array.from({ length: 12 }, (_, index) => ({
      city: { id: 800 + index, name: `Fallback ${index + 1}` },
      country: { id: 44, name: "United Kingdom" },
      state: { id: 99, name: "England Region" },
    })),
  ];

  const result = buildAwqatCityDiscoveryShortlist(candidates, 10);

  assert.equal(result.preferredMatchFound, true);
  assert.equal(result.bestMatch?.city.name, "London");
  assert.deepEqual(
    result.fallbackCandidates.slice(0, 3).map((candidate) => candidate.city.name),
    ["East London", "North London", "Bexley"],
  );
  assert.equal(result.fallbackCandidates.length, 10);
});

test("city discovery shortlist returns fallback candidates without pretending a preferred match exists", () => {
  const result = buildAwqatCityDiscoveryShortlist(
    [
      {
        city: { id: 700, name: "Manchester" },
        country: { id: 44, name: "United Kingdom" },
        state: { id: 55, name: "England Region" },
      },
      {
        city: { id: 701, name: "Leeds" },
        country: { id: 44, name: "United Kingdom" },
        state: { id: 55, name: "England Region" },
      },
    ],
    10,
  );

  assert.equal(result.preferredMatchFound, false);
  assert.equal(result.bestMatch, null);
  assert.deepEqual(
    result.fallbackCandidates.map((candidate) => candidate.city.name),
    ["Leeds", "Manchester"],
  );
});
