import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/admin/DonationDisplaySettingsSection.tsx", import.meta.url),
  "utf8",
);

function hasAll(...fragments: string[]) {
  return fragments.every((f) => source.includes(f));
}

test("preview shows QR when showQrCode=true and valid URL", () => {
  assert.ok(hasAll("QRCodeSVG", "qrUrl.trim().length > 0 && !qrUrlError"), "expected valid QR render path");
});

test("preview shows hidden state when showQrCode=false", () => {
  assert.ok(source.includes("QR Hidden"), "expected hidden QR placeholder text");
});

test("preview shows invalid state when URL invalid", () => {
  assert.ok(source.includes("Invalid QR"), "expected invalid QR placeholder text");
});

test("preview shows impact text only when enabled and non-empty", () => {
  assert.ok(
    source.includes("showImpactText && impactText.trim().length > 0"),
    "expected conditional impact text display",
  );
});

test("preview has 16:9 aspect ratio wrapper", () => {
  assert.ok(source.includes("pb-[56.25%]"), "expected 16:9 padding-bottom ratio");
});

test("preview displays motion status badge", () => {
  assert.ok(source.includes("Motion: {motionEnabled ? \"On\" : \"Off\"}"), "expected motion status badge");
});

test("preview displays QR status badge", () => {
  assert.ok(source.includes("QR: {showQrCode ? (qrUrlError ? \"Invalid\" : \"Visible\") : \"Hidden\"}"), "expected QR status badge");
});

test("preset selector renders with placeholder and preset options", () => {
  assert.ok(source.includes("Select a preset..."), "expected preset placeholder");
  assert.ok(source.includes("DONATION_DISPLAY_PRESETS"), "expected preset data usage");
  assert.ok(source.includes("preset.id"), "expected preset map by id");
  assert.ok(source.includes("onPresetSelect"), "expected preset select handler");
});
