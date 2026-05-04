import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const prayerTimesSectionSource = readFileSync(
  new URL("../src/components/admin/PrayerTimesSection.tsx", import.meta.url),
  "utf8",
);

test("prayer time source UI shows clear Manual Entry and Awqat Salah actions", () => {
  assert.match(prayerTimesSectionSource, /Current source:\s*\{currentSourceLabel\}/);
  assert.match(prayerTimesSectionSource, /label:\s*"Use Manual Entry", value:\s*"manual"/);
  assert.match(prayerTimesSectionSource, /label:\s*"Use Awqat Salah API", value:\s*"awqat-salah"/);
  assert.match(
    prayerTimesSectionSource,
    /primaryPrayerTimeSourceOptions\.map\(\(option\) => \{/,
  );
  assert.match(
    prayerTimesSectionSource,
    /onClick=\{\(\) => onSourceChange\(option\.value\)\}/,
  );
  assert.match(
    prayerTimesSectionSource,
    /Saving manual prayer times updates prayerTimes\/current only\. It does not change this source setting\./,
  );
  assert.doesNotMatch(prayerTimesSectionSource, /Otomatik Aladhan moduna dön/);
});
