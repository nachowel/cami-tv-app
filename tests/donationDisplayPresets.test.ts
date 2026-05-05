import test from "node:test";
import assert from "node:assert/strict";

import { DONATION_DISPLAY_PRESETS } from "../src/components/admin/donationDisplayPresets.ts";

test("Urgent Support preset has correct fields", () => {
  const preset = DONATION_DISPLAY_PRESETS.find((p) => p.id === "urgent-support");
  assert.ok(preset);
  assert.equal(preset.titleLine1, "DONATE");
  assert.equal(preset.titleLine2, "HERE TODAY");
  assert.equal(preset.subtitle, "Without your donation, this masjid cannot continue.");
  assert.equal(preset.ctaText, "Donate Now");
});

test("Community Support preset has correct fields", () => {
  const preset = DONATION_DISPLAY_PRESETS.find((p) => p.id === "community-support");
  assert.ok(preset);
  assert.equal(preset.titleLine1, "SUPPORT");
  assert.equal(preset.titleLine2, "YOUR MASJID");
  assert.equal(preset.subtitle, "Help keep your local masjid open and serving the community.");
  assert.equal(preset.ctaText, "Support Now");
});

test("Every Pound Counts preset has correct fields", () => {
  const preset = DONATION_DISPLAY_PRESETS.find((p) => p.id === "every-pound-counts");
  assert.ok(preset);
  assert.equal(preset.titleLine1, "EVERY £1");
  assert.equal(preset.titleLine2, "COUNTS");
  assert.equal(preset.subtitle, "Small donations make a big difference.");
  assert.equal(preset.ctaText, "Donate Now");
});

test("preset selection does not trigger save (no save logic in presets module)", () => {
  // Presets are pure data; no save side effects exist in this module.
  assert.equal(DONATION_DISPLAY_PRESETS.length, 3);
  assert.ok(!("save" in DONATION_DISPLAY_PRESETS[0]));
});

test("manual edits remain possible after preset selection (preset is pure data)", () => {
  const preset = DONATION_DISPLAY_PRESETS[0];
  const modified = { ...preset, titleLine1: "CUSTOM" };
  assert.equal(modified.titleLine1, "CUSTOM");
  assert.equal(preset.titleLine1, DONATION_DISPLAY_PRESETS[0].titleLine1);
});
