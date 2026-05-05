import test from "node:test";
import assert from "node:assert/strict";
import { resolveDonationTitleLines } from "../src/utils/donationDisplayFallback.ts";

test("new titleLine1/titleLine2 override legacy headline", () => {
  const result = resolveDonationTitleLines({
    titleLine1: "Support",
    titleLine2: "Our Masjid",
    headline: "DONATE TODAY",
  });
  assert.equal(result.titleLine1, "SUPPORT");
  assert.equal(result.titleLine2, "OUR MASJID");
});

test("empty new fields fall back safely", () => {
  const result = resolveDonationTitleLines({
    titleLine1: "",
    titleLine2: "",
    headline: "",
  });
  assert.equal(result.titleLine1, "DONATE");
  assert.equal(result.titleLine2, "HERE TODAY");
});

test("legacy headline with multiple words does not lose important text", () => {
  const result = resolveDonationTitleLines({
    titleLine1: "",
    titleLine2: "",
    headline: "DONATE TODAY",
  });
  assert.equal(result.titleLine1, "DONATE");
  assert.equal(result.titleLine2, "DONATE TODAY");
});
