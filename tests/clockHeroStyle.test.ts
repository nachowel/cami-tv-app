import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/tv/ClockPanel.tsx", import.meta.url), "utf8");

test("clock hero uses a slightly heavier centered style without changing its vertical footprint", () => {
  assert.match(source, /font-\[950\]/);
  assert.match(source, /tracking-\[-0\.02em\]/);
  assert.match(source, /text-center/);
});
