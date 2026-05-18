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
    { imageUrl: "https://example.org/one.jpg", showQr: false },
    { imageUrl: "https://example.org/two.png", showQr: true },
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
    { imageUrl: "https://example.org/one.jpg", showQr: true },
    { imageUrl: "https://example.org/two.png", showQr: true },
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
    { imageUrl: "https://example.org/background.jpg", showQr: false },
    { imageUrl: "https://example.org/extra.webp", showQr: true },
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
    { imageUrl: "https://example.org/background.jpg", showQr: true },
    { imageUrl: "https://example.org/announcement.jpg", showQr: false },
    { imageUrl: "https://example.org/donation.webp", showQr: true },
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
    { imageUrl: "https://example.org/background.jpg", showQr: true },
    { imageUrl: "https://example.org/legacy-one.jpg", showQr: true },
    { imageUrl: "https://example.org/legacy-two.png", showQr: true },
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
    { imageUrl: "https://example.org/background.jpg", showQr: false },
    { imageUrl: "https://example.org/announcement.jpg", showQr: false },
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
