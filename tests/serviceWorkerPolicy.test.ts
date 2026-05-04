import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const swSource = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("service worker uses an explicit versioned cache name", () => {
  assert.match(swSource, /const\s+SHELL_CACHE\s+=\s+"icmg-admin-shell-v2"/);
});

test("service worker deletes old caches on activate", () => {
  assert.match(swSource, /caches\.keys\(\)/);
  assert.match(swSource, /\.filter\(\s*\(\s*key\s*\)\s*=>\s*key\s*!==\s*SHELL_CACHE/);
  assert.match(swSource, /\.map\(\s*\(\s*key\s*\)\s*=>\s*caches\.delete\(\s*key\s*\)/);
});

test("service worker calls clients.claim after activation", () => {
  assert.match(swSource, /self\.clients\.claim\(\)/);
});

test("service worker only handles same-origin GET requests", () => {
  assert.match(swSource, /request\.method\s*!==\s*"GET"/);
  assert.match(swSource, /!request\.url\.startsWith\(self\.location\.origin\)/);
});

test("service worker explicitly bails out for api, firebase, and firestore paths", () => {
  assert.match(swSource, /path\.startsWith\("\/api\/"\)/);
  assert.match(swSource, /path\.startsWith\("\/__\/"\)/);
  assert.match(swSource, /path\.startsWith\("\/firestore\/"\)/);
});

test("service worker does not aggressively cache non-shell assets", () => {
  // It should have an early return for anything that is not a shell asset.
  assert.match(swSource, /if\s*\(\s*!isShell\s*\)\s*\{/);
  assert.match(swSource, /return;\s*\}/);
});

test("service worker caches only the minimal shell asset list", () => {
  assert.match(swSource, /const\s+SHELL_ASSETS\s*=\s*\[/);
  assert.match(swSource, /"\/"/);
  assert.match(swSource, /"\/index\.html"/);
  assert.match(swSource, /"\/favicon\.svg"/);
});

test("service worker uses network-first for shell assets", () => {
  assert.match(swSource, /fetch\(request\)/);
  assert.match(swSource, /cache\.put\(request,\s*clone\)/);
  assert.match(swSource, /\.catch\(\(\)\s*=>\s*caches\.match\(request\)\)/);
});
