import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("tv app serves the display from root while keeping the legacy /tv path", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(appSource, /<Route path="\/" element={<TvDisplay \/>} \/>/);
  assert.match(appSource, /<Route path="\/tv" element={<TvDisplay \/>} \/>/);
  assert.doesNotMatch(appSource, /<Navigate to="\/tv" replace \/>/);
});
