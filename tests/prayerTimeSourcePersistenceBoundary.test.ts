import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPanelSource = readFileSync(
  new URL("../src/routes/AdminPanel.tsx", import.meta.url),
  "utf8",
);

test("source switch persists settings/prayerTimes through savePrayerTimeSettings", () => {
  const sourceChangeMatch = adminPanelSource.match(
    /function handlePrayerTimeSourceChange\(nextSource: PrayerTimeSourceSettings\["source"\]\) \{([\s\S]*?)\n  \}\n\n  async function handleDailyContentSubmit/,
  );

  assert.ok(sourceChangeMatch, "expected to locate handlePrayerTimeSourceChange");

  const sourceChangeBody = sourceChangeMatch[1] ?? "";

  assert.match(sourceChangeBody, /source: nextSource/);
  assert.match(sourceChangeBody, /updatedBy: userEmail/);
  assert.match(sourceChangeBody, /persist: savePrayerTimeSettings/);
});

test("manual prayer time save updates prayerTimes current without overwriting source settings", () => {
  const manualSaveMatch = adminPanelSource.match(
    /async function handlePrayerTimesSubmit\(\) \{([\s\S]*?)\n  \}\n\n  function handlePrayerTimeSourceChange/,
  );

  assert.ok(manualSaveMatch, "expected to locate handlePrayerTimesSubmit");

  const manualSaveBody = manualSaveMatch[1] ?? "";

  assert.match(manualSaveBody, /createManualPrayerTimesSaveValue/);
  assert.match(manualSaveBody, /persist: savePrayerTimesCurrent/);
  assert.doesNotMatch(manualSaveBody, /savePrayerTimeSettings/);
});
