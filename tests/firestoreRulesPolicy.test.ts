import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("firestore rules allow admins to read and write settings/prayerTimes", () => {
  const rules = readFileSync("firestore.rules", "utf8");

  assert.match(rules, /match \/settings\/prayerTimes\s*\{[\s\S]*allow read,\s*write:\s*if isAdmin\(\);[\s\S]*\}/);
});

test("firestore rules allow public read and admin write to settings/donationDisplay", () => {
  const rules = readFileSync("firestore.rules", "utf8");

  assert.match(rules, /match \/settings\/donationDisplay\s*\{[\s\S]*allow read:\s*if true;[\s\S]*\}/);
  assert.match(rules, /match \/settings\/donationDisplay\s*\{[\s\S]*allow write:\s*if isAdmin\(\);[\s\S]*\}/);
});
