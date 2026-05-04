import test from "node:test";
import assert from "node:assert/strict";

import {
  estimatePrayerPanelAvailableHeight,
  estimatePrayerPanelRequiredHeight,
  resolveTvViewportLayout,
} from "../src/components/tv/tvViewportLayout.ts";

test("1920x1080 layout preserves a full hd stage with a safe area and fixed footer row", () => {
  const layout = resolveTvViewportLayout(1920, 1080);

  assert.equal(layout.stageWidth, 1920);
  assert.equal(layout.stageHeight, 1080);
  assert.ok(layout.safePaddingX >= 32 && layout.safePaddingX <= 48);
  assert.ok(layout.safePaddingY >= 14 && layout.safePaddingY <= 24);
  assert.ok(layout.footerHeight >= 38 && layout.footerHeight <= 56);
  assert.ok(layout.middleRowHeight > 0);
  assert.ok(layout.topRowHeight > layout.middleRowHeight);
});

test("1366x768 layout fits within the viewport without collapsing the content rows", () => {
  const layout = resolveTvViewportLayout(1366, 768);

  assert.ok(layout.stageWidth <= 1366);
  assert.ok(layout.stageHeight <= 768);
  assert.ok(Math.abs((layout.stageWidth / layout.stageHeight) - (16 / 9)) < 0.01);
  assert.ok(layout.safePaddingX < 40);
  assert.ok(layout.footerHeight >= 38);
  assert.ok(layout.topRowHeight > 0);
});

test("1280x720 layout reduces spacing while keeping a visible footer and middle cards", () => {
  const layout = resolveTvViewportLayout(1280, 720);

  assert.ok(layout.stageWidth <= 1280);
  assert.ok(layout.stageHeight <= 720);
  assert.ok(layout.safePaddingX <= 32);
  assert.ok(layout.safePaddingY <= 18);
  assert.ok(layout.middleRowHeight >= 128);
  assert.ok(layout.footerHeight >= 38);
  assert.ok(layout.topRowHeight > layout.footerHeight);
});

test("kiosk-effective height still reserves enough vertical budget for six prayer rows", () => {
  const layout = resolveTvViewportLayout(1920, 960);

  assert.ok(layout.middleRowHeight <= 200);
  assert.ok(layout.footerHeight <= 54);
  assert.ok(layout.topRowHeight >= 640);
  assert.ok(estimatePrayerPanelAvailableHeight(layout) >= estimatePrayerPanelRequiredHeight(layout) + 8);
});

test("720p layout still reserves enough prayer panel height for all six rows", () => {
  const layout = resolveTvViewportLayout(1280, 720);

  assert.ok(layout.footerHeight <= 48);
  assert.ok(layout.middleRowHeight <= 164);
  assert.ok(estimatePrayerPanelAvailableHeight(layout) >= estimatePrayerPanelRequiredHeight(layout) + 4);
});
