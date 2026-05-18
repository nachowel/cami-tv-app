import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULT_CLOUDINARY_CLOUD_NAME,
  DEFAULT_CLOUDINARY_UNSIGNED_UPLOAD_PRESET,
  DONATION_SLIDE_UPLOAD_MAX_BYTES,
  getDonationSlideUploadEndpoint,
  resolveCloudinaryUnsignedUploadConfig,
  validateDonationSlideUploadFile,
} from "../src/services/donationSlideUploadService.ts";

const serviceSource = readFileSync(
  new URL("../src/services/donationSlideUploadService.ts", import.meta.url),
  "utf8",
);

test("donation slide upload validation accepts jpg, png, and webp images", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(
      validateDonationSlideUploadFile({ name: "slide.jpg", size: 1024, type }),
      null,
    );
  }
});

test("donation slide upload validation rejects non-image files", () => {
  assert.equal(
    validateDonationSlideUploadFile({ name: "slide.pdf", size: 1024, type: "application/pdf" }),
    "Please choose a JPG, PNG, or WebP image.",
  );
});

test("donation slide upload validation rejects oversized files", () => {
  assert.equal(
    validateDonationSlideUploadFile({
      name: "slide.jpg",
      size: DONATION_SLIDE_UPLOAD_MAX_BYTES + 1,
      type: "image/jpeg",
    }),
    "Image must be 5MB or smaller.",
  );
});

test("frontend upload service does not expose the Cloudinary API secret", () => {
  assert.equal(serviceSource.includes("CLOUDINARY_API_SECRET"), false);
});

test("donation slide upload uses the configured unsigned Cloudinary endpoint", () => {
  assert.equal(DEFAULT_CLOUDINARY_CLOUD_NAME, "dpfoo0oew");
  assert.equal(DEFAULT_CLOUDINARY_UNSIGNED_UPLOAD_PRESET, "icmg_donation_unsigned");
  assert.equal(
    getDonationSlideUploadEndpoint(),
    "https://api.cloudinary.com/v1_1/dpfoo0oew/image/upload",
  );
});

test("donation slide upload supports Vite Cloudinary env overrides", () => {
  assert.deepEqual(
    resolveCloudinaryUnsignedUploadConfig({
      VITE_CLOUDINARY_CLOUD_NAME: "custom-cloud",
      VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET: "custom-preset",
    }),
    {
      cloudName: "custom-cloud",
      unsignedUploadPreset: "custom-preset",
    },
  );
});

test("frontend upload service uses unsigned Cloudinary FormData without Firebase auth", () => {
  assert.ok(serviceSource.includes('body.append("upload_preset"'), "expected upload_preset form field");
  assert.equal(serviceSource.includes("Authorization"), false);
  assert.equal(serviceSource.includes("Bearer"), false);
  assert.equal(serviceSource.includes("readCurrentUserIdToken"), false);
  assert.equal(serviceSource.includes("cloudfunctions.net"), false);
});
