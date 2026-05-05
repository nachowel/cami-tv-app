import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPanelSource = readFileSync(
  new URL("../src/routes/AdminPanel.tsx", import.meta.url),
  "utf8",
);

const sectionSource = readFileSync(
  new URL("../src/components/admin/DonationDisplaySettingsSection.tsx", import.meta.url),
  "utf8",
);

const { DEFAULT_DONATION_DISPLAY_CONFIG } = await import(
  "../src/services/firestoreDisplayService.ts"
);

test("reset button exists in admin section", () => {
  assert.ok(sectionSource.includes("Reset to default"), "expected reset button text");
});

test("reset handler uses window.confirm", () => {
  assert.ok(adminPanelSource.includes("window.confirm"), "expected confirm prompt");
  assert.ok(
    adminPanelSource.includes("Reset donation display to default values?"),
    "expected confirm message",
  );
});

test("reset handler fills all draft fields from DEFAULT_DONATION_DISPLAY_CONFIG", () => {
  assert.ok(adminPanelSource.includes("handleDonationDisplayReset"), "expected reset handler");
  assert.ok(
    adminPanelSource.includes("DEFAULT_DONATION_DISPLAY_CONFIG.titleLine1"),
    "expected titleLine1 default",
  );
  assert.ok(
    adminPanelSource.includes("DEFAULT_DONATION_DISPLAY_CONFIG.titleLine2"),
    "expected titleLine2 default",
  );
  assert.ok(
    adminPanelSource.includes("DEFAULT_DONATION_DISPLAY_CONFIG.subtitle"),
    "expected subtitle default",
  );
  assert.ok(
    adminPanelSource.includes("DEFAULT_DONATION_DISPLAY_CONFIG.ctaText"),
    "expected ctaText default",
  );
  assert.ok(
    adminPanelSource.includes("DEFAULT_DONATION_DISPLAY_CONFIG.qrUrl"),
    "expected qrUrl default",
  );
  assert.ok(
    adminPanelSource.includes("DEFAULT_DONATION_DISPLAY_CONFIG.showQrCode"),
    "expected showQrCode default",
  );
  assert.ok(
    adminPanelSource.includes("DEFAULT_DONATION_DISPLAY_CONFIG.motionEnabled"),
    "expected motionEnabled default",
  );
});

test("reset does not trigger save (no persist call in reset handler)", () => {
  const resetHandlerMatch = adminPanelSource.match(/function handleDonationDisplayReset\(\)[\s\S]*?^\s*\}/m);
  assert.ok(resetHandlerMatch, "expected to find reset handler");
  const handlerBody = resetHandlerMatch[0];
  assert.ok(!handlerBody.includes("saveDonationDisplayConfig"), "reset must not call save");
  assert.ok(!handlerBody.includes("commitAdminSectionSave"), "reset must not call commit save");
});

test("cancelled confirmation does nothing (returns early)", () => {
  assert.ok(adminPanelSource.includes("if (!confirmed) return;"), "expected early return on cancel");
});

test("DEFAULT_DONATION_DISPLAY_CONFIG has all required fields for reset", () => {
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.titleLine1, "DONATE");
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.titleLine2, "HERE TODAY");
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.subtitle, "Without your donation, this masjid cannot continue.");
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.mainMessage, "THIS MASJID CANNOT CONTINUE");
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.ctaText, "GIVE NOW — CASH OR CARD ↓");
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.qrUrl, "https://www.icmgbexley.org.uk/donation");
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.showImpactText, false);
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.showQrCode, true);
  assert.equal(DEFAULT_DONATION_DISPLAY_CONFIG.motionEnabled, true);
});
