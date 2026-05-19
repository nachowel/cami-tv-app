import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeSlideImages,
  resolveDonationSlideshowImages,
  shouldShowQrForDonationSlide,
} from "../src/utils/donationDisplaySlideshow.ts";

test("normalizeSlideImages trims, removes empty rows, and deduplicates before save", () => {
  const result = normalizeSlideImages([
    { imageUrl: " https://example.org/one.jpg ", showQr: false },
    { imageUrl: "", showQr: true },
    { imageUrl: "https://example.org/two.png", showQr: true },
    { imageUrl: "https://example.org/one.jpg", showQr: true },
  ]);

  assert.deepEqual(result, [
    { imageUrl: "https://example.org/one.jpg", showQr: false, durationSeconds: -1 },
    { imageUrl: "https://example.org/two.png", showQr: true, durationSeconds: -1 },
  ]);
});

test("normalizeSlideImages migrates legacy string entries to showQr true", () => {
  const result = normalizeSlideImages([
    " https://example.org/one.jpg ",
    "",
    "https://example.org/two.png",
    "https://example.org/one.jpg",
  ]);

  assert.deepEqual(result, [
    { imageUrl: "https://example.org/one.jpg", showQr: true, durationSeconds: -1 },
    { imageUrl: "https://example.org/two.png", showQr: true, durationSeconds: -1 },
  ]);
});

test("resolveDonationSlideshowImages includes background first with the global QR setting", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: false,
    slideImages: [
      { imageUrl: "https://example.org/extra.webp", showQr: true },
      { imageUrl: "https://example.org/background.jpg", showQr: true },
    ],
  });

  assert.deepEqual(result, [
    { imageUrl: "https://example.org/background.jpg", showQr: false, durationSeconds: 30 },
    { imageUrl: "https://example.org/extra.webp", showQr: true, durationSeconds: 30 },
  ]);
});

test("resolveDonationSlideshowImages includes background plus all slideImages for rotation", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: true,
    slideImages: [
      { imageUrl: "https://example.org/announcement.jpg", showQr: false },
      { imageUrl: "https://example.org/donation.webp", showQr: true },
    ],
  });

  assert.deepEqual(result, [
    { imageUrl: "https://example.org/background.jpg", showQr: true, durationSeconds: 30 },
    { imageUrl: "https://example.org/announcement.jpg", showQr: false, durationSeconds: 30 },
    { imageUrl: "https://example.org/donation.webp", showQr: true, durationSeconds: 30 },
  ]);
});

test("resolveDonationSlideshowImages falls back to legacy slideImageUrls when slideImages is empty", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: true,
    slideImages: [],
    slideImageUrls: [
      "https://example.org/legacy-one.jpg",
      "https://example.org/legacy-two.png",
    ],
  });

  assert.deepEqual(result, [
    { imageUrl: "https://example.org/background.jpg", showQr: true, durationSeconds: 30 },
    { imageUrl: "https://example.org/legacy-one.jpg", showQr: true, durationSeconds: 30 },
    { imageUrl: "https://example.org/legacy-two.png", showQr: true, durationSeconds: 30 },
  ]);
});

test("resolveDonationSlideshowImages dedupes by imageUrl while preserving first slide QR setting", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: false,
    slideImages: [
      { imageUrl: "https://example.org/background.jpg", showQr: true },
      { imageUrl: "https://example.org/announcement.jpg", showQr: false },
      { imageUrl: "https://example.org/announcement.jpg", showQr: true },
    ],
  });

  assert.deepEqual(result, [
    { imageUrl: "https://example.org/background.jpg", showQr: false, durationSeconds: 30 },
    { imageUrl: "https://example.org/announcement.jpg", showQr: false, durationSeconds: 30 },
  ]);
});

test("second slide can hide QR while still remaining in the active image list", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    slideImages: [
      { imageUrl: "https://example.org/announcement.jpg", showQr: false },
      { imageUrl: "https://example.org/donation.jpg", showQr: true },
    ],
  });

  assert.equal(result[1]?.imageUrl, "https://example.org/announcement.jpg");
  assert.equal(shouldShowQrForDonationSlide(result[1]), false);
  assert.equal(result.length, 3);
});

test("shouldShowQrForDonationSlide hides QR for announcement slides and shows it for donation slides", () => {
  assert.equal(
    shouldShowQrForDonationSlide({ imageUrl: "https://example.org/announcement.jpg", showQr: false }),
    false,
  );
  assert.equal(
    shouldShowQrForDonationSlide({ imageUrl: "https://example.org/donation.jpg", showQr: true }),
    true,
  );
  assert.equal(shouldShowQrForDonationSlide(null), false);
});

test("background slide uses its own duration when provided", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: true,
    backgroundSlideDurationSeconds: 45,
    slideImages: [],
  });

  assert.equal(result[0].durationSeconds, 45);
});

test("extra slides use per-slide duration when provided", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: true,
    slideDurationSeconds: 30,
    slideImages: [
      { imageUrl: "https://example.org/slide1.jpg", showQr: true, durationSeconds: 15 },
      { imageUrl: "https://example.org/slide2.jpg", showQr: false, durationSeconds: 60 },
    ],
  });

  assert.equal(result[0].durationSeconds, 30);
  assert.equal(result[1].durationSeconds, 15);
  assert.equal(result[2].durationSeconds, 60);
});

test("slides without duration fall back to global slideDurationSeconds", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: true,
    slideDurationSeconds: 25,
    slideImages: [
      { imageUrl: "https://example.org/slide1.jpg", showQr: true },
      { imageUrl: "https://example.org/slide2.jpg", showQr: false },
    ],
  });

  assert.equal(result[0].durationSeconds, 25);
  assert.equal(result[1].durationSeconds, 25);
  assert.equal(result[2].durationSeconds, 25);
});

test("invalid duration values are clamped to safe range", () => {
  const result = resolveDonationSlideshowImages({
    backgroundImageUrl: "https://example.org/background.jpg",
    backgroundShowQr: true,
    slideDurationSeconds: 500,
    slideImages: [
      { imageUrl: "https://example.org/slide1.jpg", showQr: true, durationSeconds: 0 },
      { imageUrl: "https://example.org/slide2.jpg", showQr: false, durationSeconds: 2 },
    ],
  });

  assert.equal(result[0].durationSeconds, 300);
  assert.equal(result[1].durationSeconds, 3);
  assert.equal(result[2].durationSeconds, 3);
});
