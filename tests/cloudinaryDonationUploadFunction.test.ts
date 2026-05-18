import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const functionsIndexSource = readFileSync(
  new URL("../functions/src/index.ts", import.meta.url),
  "utf8",
);

const functionsPackageSource = readFileSync(
  new URL("../functions/package.json", import.meta.url),
  "utf8",
);

test("Firebase Functions no longer export a donation image upload endpoint", () => {
  assert.equal(functionsIndexSource.includes("uploadDonationSlideImage"), false);
  assert.equal(functionsIndexSource.includes("cloudinaryDonationUpload"), false);
});

test("Firebase Functions no longer depend on the Cloudinary upload stack", () => {
  const functionsPackage = JSON.parse(functionsPackageSource) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  assert.equal(functionsPackage.dependencies?.cloudinary, undefined);
  assert.equal(functionsPackage.dependencies?.busboy, undefined);
  assert.equal(functionsPackage.devDependencies?.["@types/busboy"], undefined);
});
