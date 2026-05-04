import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const globalsCss = readFileSync(new URL("../src/styles/globals.css", import.meta.url), "utf8");
const tvDisplayRouteSource = readFileSync(new URL("../src/routes/TvDisplay.tsx", import.meta.url), "utf8");

test("admin routes rely on normal document scrolling while tv routes apply the viewport lock", () => {
  assert.doesNotMatch(
    globalsCss,
    /html,\s*body,\s*#root\s*\{[\s\S]*overflow:\s*hidden/,
  );
  assert.match(tvDisplayRouteSource, /useTvViewportLock/);
});
