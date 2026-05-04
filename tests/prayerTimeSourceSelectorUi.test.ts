import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const prayerTimesSectionSource = readFileSync(
  new URL("../src/components/admin/PrayerTimesSection.tsx", import.meta.url),
  "utf8",
);

test("prayer time source selector includes the Awqat Salah option and binds to settings source", () => {
  assert.match(prayerTimesSectionSource, /label:\s*"Awqat Salah API", value:\s*"awqat-salah"/);
  assert.match(prayerTimesSectionSource, /value=\{prayerTimeSourceSettings\.source\}/);
  assert.match(
    prayerTimesSectionSource,
    /onChange=\{\(event\) => onSourceChange\(event\.target\.value as PrayerTimeSourceSetting\)\}/,
  );
  assert.match(
    prayerTimesSectionSource,
    /Active source:\s*\{getPrayerTimeSourceLabel\(prayerTimeSourceSettings\.source\)\}/,
  );
});
