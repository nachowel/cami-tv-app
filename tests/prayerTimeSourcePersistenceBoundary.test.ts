import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPanelSource = readFileSync(
  new URL("../src/routes/AdminPanel.tsx", import.meta.url),
  "utf8",
);
const prayerTimeAdminStateSource = readFileSync(
  new URL("../src/components/admin/prayerTimeAdminState.ts", import.meta.url),
  "utf8",
);

test("source switch persists settings/prayerTimes through savePrayerTimeSettings", () => {
  const sourceChangeMatch = adminPanelSource.match(
    /async function handlePrayerTimeSourceChange\(nextSource: PrayerTimeSourceSettings\["source"\]\) \{([\s\S]*?)\n  \}\n\n  async function handleDailyContentSubmit/,
  );

  assert.ok(sourceChangeMatch, "expected to locate handlePrayerTimeSourceChange");

  const sourceChangeBody = sourceChangeMatch[1] ?? "";

  assert.match(sourceChangeBody, /createPrayerTimeSourceSelectionUpdate/);
  assert.match(sourceChangeBody, /updatedBy:\s*userEmail/);
  assert.match(sourceChangeBody, /persist: savePrayerTimeSettings/);
  assert.match(prayerTimeAdminStateSource, /source:\s*input\.nextSource/);
});

test("manual prayer time save updates prayerTimes current without overwriting source settings", () => {
  const manualSaveMatch = adminPanelSource.match(
    /async function handlePrayerTimesSubmit\(\) \{([\s\S]*?)\n  \}\n\n  async function handleSwitchPrayerTimesToAutomatic/,
  );

  assert.ok(manualSaveMatch, "expected to locate handlePrayerTimesSubmit");

  const manualSaveBody = manualSaveMatch[1] ?? "";

  assert.match(manualSaveBody, /createManualPrayerTimesSaveValue/);
  assert.match(manualSaveBody, /persist: savePrayerTimesCurrent/);
  assert.doesNotMatch(manualSaveBody, /savePrayerTimeSettings/);
});
