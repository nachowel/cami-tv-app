import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("firestore rules allow admins to read and write settings/prayerTimes", () => {
  const rules = readFileSync("firestore.rules", "utf8");

  assert.match(rules, /match \/settings\/prayerTimes\s*\{[\s\S]*allow read,\s*write:\s*if isAdmin\(\);[\s\S]*\}/);
});
