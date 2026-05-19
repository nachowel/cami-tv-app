import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layoutSource = readFileSync(
  new URL("../src/components/tv/DonationDisplayLayout.tsx", import.meta.url),
  "utf8",
);

const validationSource = readFileSync(
  new URL("../src/utils/validation.ts", import.meta.url),
  "utf8",
);

const adminSectionSource = readFileSync(
  new URL("../src/components/admin/DonationDisplaySettingsSection.tsx", import.meta.url),
  "utf8",
);

test("image mode renders background image", () => {
  assert.ok(layoutSource.includes('displayMode === "image"'), "expected image mode check");
  assert.ok(layoutSource.includes('className="absolute inset-0 h-full w-full object-contain"'), "expected object-contain background image");
});

test("image mode hides component text", () => {
  assert.ok(layoutSource.includes("isImageMode"), "expected isImageMode flag");
  assert.ok(layoutSource.includes('if (isImageMode)'), "expected image mode early return");
});

test("QR overlay renders in image mode", () => {
  assert.ok(layoutSource.includes("qrOverlayEnabled"), "expected qrOverlayEnabled check");
  assert.ok(layoutSource.includes("qrOverlayXPercent"), "expected qrOverlayXPercent usage");
  assert.ok(layoutSource.includes("qrOverlayYPercent"), "expected qrOverlayYPercent usage");
  assert.ok(layoutSource.includes("qrOverlaySizePercent"), "expected qrOverlaySizePercent usage");
});

test("missing image falls back to component mode", () => {
  assert.ok(layoutSource.includes("hasBackgroundImage"), "expected hasBackgroundImage check");
  assert.ok(layoutSource.includes('safeConfig.displayMode === "image" && hasBackgroundImage'), "expected combined condition for image mode");
});

test("validation blocks invalid background image URL", () => {
  assert.ok(validationSource.includes("validateBackgroundImageUrl"), "expected validateBackgroundImageUrl function");
  assert.ok(validationSource.includes("Background image URL is required in image mode."), "expected required error");
  assert.ok(validationSource.includes("Background image URL must be a valid http/https address."), "expected invalid URL error");
});

test("admin section has display mode selector", () => {
  assert.ok(adminSectionSource.includes("Display Mode"), "expected display mode label");
  assert.ok(adminSectionSource.includes('type="radio"'), "expected radio inputs");
  assert.ok(adminSectionSource.includes('onDisplayModeChange'), "expected display mode handler");
});

test("admin section has QR overlay controls", () => {
  assert.ok(adminSectionSource.includes("Overlay X %"), "expected X percent label");
  assert.ok(adminSectionSource.includes("Overlay Y %"), "expected Y percent label");
  assert.ok(adminSectionSource.includes("Overlay Size %"), "expected Size percent label");
  assert.ok(adminSectionSource.includes("qrOverlayEnabled"), "expected QR overlay enabled checkbox");
});

test("admin preview shows image mode when selected", () => {
  assert.ok(adminSectionSource.includes('isImageMode && backgroundImageUrl.trim().length > 0'), "expected image mode preview condition");
  assert.ok(adminSectionSource.includes('object-contain'), "expected object-contain in preview");
});

test("admin shows 16:9 helper text for background image", () => {
  assert.ok(adminSectionSource.includes("Use a 16:9 image for best TV fit."), "expected 16:9 helper text");
});

test("admin clamps QR overlay X and Y to 0–100", () => {
  assert.ok(adminSectionSource.includes("clamp(Number(event.target.value), 0, 100)"), "expected X/Y clamp");
});

test("admin clamps QR overlay size to 5–30", () => {
  assert.ok(adminSectionSource.includes("clamp(Number(event.target.value), 5, 30)"), "expected size clamp");
});

test("TV falls back to component mode when background image fails to load", () => {
  assert.ok(layoutSource.includes("setImageLoadFailed(true)"), "expected imageLoadFailed state");
  assert.ok(layoutSource.includes("onError={() =>"), "expected onError handler on img");
  assert.ok(layoutSource.includes("console.warn"), "expected console warning on image failure");
  assert.ok(layoutSource.includes("!imageLoadFailed"), "expected imageLoadFailed guard in isImageMode");
});

test("TV clamps QR overlay values before rendering", () => {
  assert.ok(layoutSource.includes("clamp(safeConfig.qrOverlaySizePercent, 5, 30)"), "expected size clamp in TV");
  assert.ok(layoutSource.includes("clamp(safeConfig.qrOverlayXPercent, 0, 100)"), "expected X clamp in TV");
  assert.ok(layoutSource.includes("clamp(safeConfig.qrOverlayYPercent, 0, 100)"), "expected Y clamp in TV");
});

test("slideshow disabled keeps the single background image behavior", () => {
  assert.ok(layoutSource.includes("const slideshowEnabled = safeConfig.slideshowEnabled === true"), "expected explicit slideshow enabled guard");
  assert.ok(layoutSource.includes("!slideshowEnabled"), "expected disabled slideshow branch");
  assert.ok(layoutSource.includes("src={safeConfig.backgroundImageUrl}"), "expected legacy background image src to remain available");
});

test("slideshow enabled rotates images on the configured interval", () => {
  assert.ok(layoutSource.includes("setTimeout"), "expected per-slide timeout instead of setInterval");
  assert.ok(layoutSource.includes("slideshowIntervalSeconds"), "expected seconds-based interval");
  assert.ok(layoutSource.includes("setActiveSlideIndex"), "expected active slide index update");
});

test("admin has slideshow controls and preview navigation", () => {
  assert.ok(adminSectionSource.includes("Enable slideshow"), "expected slideshow checkbox");
  assert.ok(adminSectionSource.includes("Default slide duration seconds"), "expected default slide duration input");
  assert.ok(adminSectionSource.includes("Main slide duration seconds"), "expected main slide duration input");
  assert.ok(adminSectionSource.includes("Slide 1 of"), "expected slide count preview text");
  assert.ok(adminSectionSource.includes("Previous"), "expected previous preview button");
  assert.ok(adminSectionSource.includes("Next"), "expected next preview button");
  assert.ok(adminSectionSource.includes("Add image URL"), "expected add slide button");
  assert.ok(adminSectionSource.includes("Remove"), "expected remove slide button");
  assert.ok(adminSectionSource.includes("Show QR on this slide"), "expected per-slide QR checkbox");
  assert.ok(adminSectionSource.includes("Duration (seconds)"), "expected per-slide duration input");
});

test("slideshow skips failed images and preloads next image", () => {
  assert.ok(layoutSource.includes("new Image()"), "expected image preloading");
  assert.ok(layoutSource.includes("image.onerror"), "expected preload error handler");
  assert.ok(layoutSource.includes("image.onload"), "expected preload load handler");
  assert.ok(layoutSource.includes("failedSlideUrls"), "expected failed image tracking");
  assert.ok(layoutSource.includes("setFailedSlideUrls"), "expected failed image state update");
});

test("slideshow preload handlers are cleaned up on config changes", () => {
  assert.ok(layoutSource.includes("image.onerror = null"), "expected preload error handler cleanup");
  assert.ok(layoutSource.includes("image.onload = null"), "expected preload load handler cleanup");
});

test("empty slideImageUrls falls back to backgroundImageUrl", () => {
  assert.ok(layoutSource.includes("resolveDonationSlideshowImages"), "expected centralized slideshow image resolution");
  assert.ok(layoutSource.includes("backgroundImageUrl"), "expected background image fallback input");
});

test("TV image mode uses the active slide QR visibility", () => {
  assert.ok(layoutSource.includes("activeSlideshowSlide"), "expected active slide object");
  assert.ok(layoutSource.includes("shouldShowQrForDonationSlide(activeSlideshowSlide)"), "expected per-slide QR visibility");
  assert.ok(layoutSource.includes("showImageModeQr"), "expected image mode QR guard");
});

test("motion disabled removes slideshow transition animation", () => {
  assert.ok(layoutSource.includes('transition: motion ? "opacity 700ms ease-in-out" : undefined'), "expected transition to depend on motion");
});

test("admin has slideshow controls and preview navigation", () => {
  assert.ok(adminSectionSource.includes("Enable slideshow"), "expected slideshow checkbox");
  assert.ok(adminSectionSource.includes("Default slide duration seconds"), "expected default slide duration input");
  assert.ok(adminSectionSource.includes("Main slide duration seconds"), "expected main slide duration input");
  assert.ok(adminSectionSource.includes("Slide 1 of"), "expected slide count preview text");
  assert.ok(adminSectionSource.includes("Previous"), "expected previous preview button");
  assert.ok(adminSectionSource.includes("Next"), "expected next preview button");
  assert.ok(adminSectionSource.includes("Add image URL"), "expected add slide button");
  assert.ok(adminSectionSource.includes("Remove"), "expected remove slide button");
  assert.ok(adminSectionSource.includes("Show QR on this slide"), "expected per-slide QR checkbox");
  assert.ok(adminSectionSource.includes("Duration (seconds)"), "expected per-slide duration input");
});
