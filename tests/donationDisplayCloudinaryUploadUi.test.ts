import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminSectionSource = readFileSync(
  new URL("../src/components/admin/DonationDisplaySettingsSection.tsx", import.meta.url),
  "utf8",
);

const adminPanelSource = readFileSync(
  new URL("../src/routes/AdminPanel.tsx", import.meta.url),
  "utf8",
);

const uploadServiceSource = readFileSync(
  new URL("../src/services/donationSlideUploadService.ts", import.meta.url),
  "utf8",
);

test("admin donation display exposes upload controls for background and slide rows", () => {
  assert.ok(adminSectionSource.includes("Upload image"), "expected upload button text");
  assert.ok(adminSectionSource.includes('type="file"'), "expected file input controls");
  assert.ok(adminSectionSource.includes("image/jpeg,image/png,image/webp"), "expected image accept list");
  assert.ok(adminSectionSource.includes("onBackgroundImageUpload"), "expected background upload callback");
  assert.ok(adminSectionSource.includes("onSlideImageUpload"), "expected slide row upload callback");
});

test("admin donation display shows upload loading and error states", () => {
  assert.ok(adminSectionSource.includes("Uploading..."), "expected upload loading state");
  assert.ok(adminSectionSource.includes("backgroundImageUploadState"), "expected background upload state prop");
  assert.ok(adminSectionSource.includes("slideImageUploadStates"), "expected row upload state props");
  assert.ok(adminSectionSource.includes(".error"), "expected upload error rendering");
});

test("successful upload fills the matching donation image URL field", () => {
  assert.ok(adminPanelSource.includes("uploadDonationSlideImage"), "expected upload service usage");
  assert.ok(adminPanelSource.includes("backgroundImageUrl: result.secure_url"), "expected background URL fill");
  assert.ok(adminPanelSource.includes("imageUrl: result.secure_url"), "expected slide URL fill");
});

test("manual donation image URL flow remains available", () => {
  assert.ok(adminSectionSource.includes("onBackgroundImageUrlChange"), "expected manual background URL handler");
  assert.ok(adminSectionSource.includes("onSlideImageUrlChange"), "expected manual slide URL handler");
  assert.ok(adminSectionSource.includes('type="url"'), "expected manual URL inputs");
});

test("admin save and load use slideImages with per-slide QR settings", () => {
  assert.ok(adminPanelSource.includes("slideImages: cfg.slideImages"), "expected Firestore load into slideImages");
  assert.ok(adminPanelSource.includes("slideImages = normalizeSlideImages"), "expected normalization before save");
  assert.ok(adminPanelSource.includes("slideImages: nextConfig.slideImages"), "expected donation/current save shape");
  assert.ok(adminSectionSource.includes("onSlideImageShowQrChange"), "expected per-slide QR change callback");
  assert.ok(adminSectionSource.includes("Show QR on this slide"), "expected per-slide QR checkbox");
});

test("admin save path preserves extra slideImages instead of saving an empty row list", () => {
  const submitHandlerMatch = adminPanelSource.match(/async function handleDonationDisplaySubmit\(\)[\s\S]*?^\s*function handleStartNewAnnouncement/m);
  assert.ok(submitHandlerMatch, "expected donation display submit handler");
  const submitHandlerSource = submitHandlerMatch[0];

  assert.ok(
    submitHandlerSource.includes("const slideImages = normalizeSlideImages(donationDisplayDraft.slideImages)"),
    "expected save to normalize draft slideImages",
  );
  assert.ok(submitHandlerSource.includes("slideImages,"), "expected settings save payload to include normalized slideImages");
  assert.ok(
    submitHandlerSource.includes("slideImages: nextConfig.slideImages"),
    "expected donation/current save payload to preserve normalized slideImages",
  );
  assert.equal(submitHandlerSource.includes("slideImages: []"), false, "save path must not force empty slideImages");
});

test("upload service posts unsigned multipart data directly to Cloudinary", () => {
  assert.ok(uploadServiceSource.includes("FormData"), "expected multipart form upload");
  assert.ok(uploadServiceSource.includes('body.append("file"'), "expected file form field");
  assert.ok(uploadServiceSource.includes('body.append("upload_preset"'), "expected upload preset form field");
  assert.ok(uploadServiceSource.includes("https://api.cloudinary.com/v1_1"), "expected Cloudinary endpoint");
  assert.equal(uploadServiceSource.includes("Authorization"), false);
  assert.equal(uploadServiceSource.includes("cloudfunctions.net"), false);
});
