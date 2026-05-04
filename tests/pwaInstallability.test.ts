import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const manifest = JSON.parse(
  readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8"),
) as {
  display?: string;
  icons?: Array<{ purpose?: string; sizes?: string; src?: string; type?: string }>;
  scope?: string;
  start_url?: string;
};

function readPngDimension(bytes: Buffer, offset: number) {
  return bytes.readUInt32BE(offset);
}

function assertPngAsset(path: string, expectedSize: number) {
  const assetUrl = new URL(`../public${path}`, import.meta.url);
  assert.equal(existsSync(assetUrl), true);

  const bytes = readFileSync(assetUrl);
  const signature = bytes.subarray(0, 8);
  assert.deepEqual(
    Array.from(signature),
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  assert.equal(readPngDimension(bytes, 16), expectedSize);
  assert.equal(readPngDimension(bytes, 20), expectedSize);
}

test("index links the web app manifest and apple touch icon", () => {
  assert.match(indexSource, /<link rel="manifest" href="\/manifest\.json" \/>/);
  assert.match(indexSource, /<link rel="apple-touch-icon" href="\/icons\/icon-192\.png" \/>/);
});

test("manifest start_url is inside scope and standalone", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.start_url, "/admin");
  assert.equal(manifest.start_url.startsWith(manifest.scope), true);
});

test("manifest references installable png icons that exist", () => {
  assert.deepEqual(
    manifest.icons?.map((icon) => ({
      purpose: icon.purpose,
      sizes: icon.sizes,
      src: icon.src,
      type: icon.type,
    })),
    [
      { purpose: undefined, sizes: "192x192", src: "/icons/icon-192.png", type: "image/png" },
      { purpose: undefined, sizes: "512x512", src: "/icons/icon-512.png", type: "image/png" },
      { purpose: "maskable", sizes: "512x512", src: "/icons/icon-maskable-512.png", type: "image/png" },
    ],
  );

  assertPngAsset("/icons/icon-192.png", 192);
  assertPngAsset("/icons/icon-512.png", 512);
  assertPngAsset("/icons/icon-maskable-512.png", 512);
});

test("service worker is registered from the app entrypoint", () => {
  assert.match(mainSource, /"serviceWorker" in navigator/);
  assert.match(mainSource, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
});
