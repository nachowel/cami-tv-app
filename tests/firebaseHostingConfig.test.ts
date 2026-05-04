import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type FirebaseConfig = {
  hosting?: {
    headers?: Array<{
      headers?: Array<{
        key?: string;
        value?: string;
      }>;
      source?: string;
    }>;
    public?: string;
    rewrites?: Array<{
      source?: string;
      destination?: string;
    }>;
  };
};

test("firebase hosting serves the Vite build output with SPA fallback", () => {
  const firebaseConfig = JSON.parse(
    readFileSync(new URL("../firebase.json", import.meta.url), "utf8"),
  ) as FirebaseConfig;

  assert.equal(firebaseConfig.hosting?.public, "dist");
  assert.deepEqual(firebaseConfig.hosting?.rewrites, [
    {
      source: "**",
      destination: "/index.html",
    },
  ]);
});

test("firebase hosting does not cache PWA metadata or icon installability assets", () => {
  const firebaseConfig = JSON.parse(
    readFileSync(new URL("../firebase.json", import.meta.url), "utf8"),
  ) as FirebaseConfig;

  assert.deepEqual(firebaseConfig.hosting?.headers, [
    {
      source: "/manifest.json",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    },
    {
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    },
    {
      source: "/icons/**",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    },
  ]);
});
