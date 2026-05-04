import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/tv/ClockPanel.tsx", import.meta.url), "utf8");

test("clock panel renders weather details as a centered vertical stack with fixed spacing", () => {
  assert.match(source, /weather-stack/);
  assert.match(source, /flex-col/);
  assert.match(source, /items-center/);
  assert.match(source, /justify-center/);
  assert.match(source, /gap-\[/);
  assert.match(source, /translate-y-\[/);
  assert.match(source, /opacity-80/);
});
