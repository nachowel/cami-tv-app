import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const globalsCss = readFileSync(new URL("../src/styles/globals.css", import.meta.url), "utf8");

test("tv viewport lock styles are scoped instead of globally disabling page scroll", () => {
  assert.doesNotMatch(
    globalsCss,
    /html,\s*body,\s*#root\s*\{[\s\S]*overflow:\s*hidden/,
  );
  assert.match(
    globalsCss,
    /html\.tv-viewport-lock,\s*body\.tv-viewport-lock,\s*#root\.tv-viewport-lock\s*\{[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*overflow:\s*hidden/,
  );
});
