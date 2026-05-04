import { useEffect, useState } from "react";

const TV_DESIGN_WIDTH = 1920;
const TV_DESIGN_HEIGHT = 1080;
const TV_ASPECT_RATIO = TV_DESIGN_WIDTH / TV_DESIGN_HEIGHT;

function clampNumber(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface TvViewportLayout {
  footerHeight: number;
  gap: number;
  middleRowHeight: number;
  prayerPanelHeaderHeight: number;
  prayerPanelMetaHeight: number;
  prayerPanelPaddingY: number;
  prayerRowHeight: number;
  safePaddingX: number;
  safePaddingY: number;
  stageHeight: number;
  stageWidth: number;
  topRowHeight: number;
  weatherColumnWidth: number;
}

export function resolveTvViewportLayout(viewportWidth: number, viewportHeight: number): TvViewportLayout {
  const safeViewportWidth = Math.max(viewportWidth, 320);
  const safeViewportHeight = Math.max(viewportHeight, 240);
  const stageWidth = Math.floor(
    Math.min(TV_DESIGN_WIDTH, safeViewportWidth, safeViewportHeight * TV_ASPECT_RATIO),
  );
  const stageHeight = Math.floor(stageWidth / TV_ASPECT_RATIO);
  const scale = Math.min(stageWidth / TV_DESIGN_WIDTH, stageHeight / TV_DESIGN_HEIGHT);

  const safePaddingX = Math.round(clampNumber(24, stageWidth * 0.0195, 40));
  const safePaddingY = Math.round(clampNumber(12, stageHeight * 0.0145, 18));
  const gap = Math.round(clampNumber(7, 11 * scale, 12));
  const footerHeight = Math.round(clampNumber(38, stageHeight * 0.044, 50));
  const middleRowHeight = Math.round(clampNumber(128, stageHeight * 0.176, 190));
  const contentHeight = stageHeight - (safePaddingY * 2) - (gap * 2);
  const topRowHeight = Math.max(0, contentHeight - middleRowHeight - footerHeight);
  const weatherColumnWidth = Math.round(clampNumber(116, stageWidth * 0.086, 148));
  const prayerPanelPaddingY = Math.round(clampNumber(8, stageHeight * 0.0085, 14));
  const prayerPanelHeaderHeight = Math.round(clampNumber(28, stageHeight * 0.028, 36));
  const prayerPanelMetaHeight = Math.round(clampNumber(10, stageHeight * 0.011, 14));
  const prayerRowHeight = Math.round(clampNumber(40, stageHeight * 0.046, 58));

  return {
    footerHeight,
    gap,
    middleRowHeight,
    prayerPanelHeaderHeight,
    prayerPanelMetaHeight,
    prayerPanelPaddingY,
    prayerRowHeight,
    safePaddingX,
    safePaddingY,
    stageHeight,
    stageWidth,
    topRowHeight,
    weatherColumnWidth,
  };
}

export function estimatePrayerPanelRequiredHeight(layout: TvViewportLayout) {
  return (layout.prayerRowHeight * 6) + layout.prayerPanelMetaHeight;
}

export function estimatePrayerPanelAvailableHeight(layout: TvViewportLayout) {
  const dividerAndSpacing = layout.gap + 4;
  return layout.topRowHeight
    - (layout.prayerPanelPaddingY * 2)
    - layout.prayerPanelHeaderHeight
    - dividerAndSpacing
    - layout.prayerPanelMetaHeight;
}

function readWindowLayout() {
  if (typeof window === "undefined") {
    return resolveTvViewportLayout(TV_DESIGN_WIDTH, TV_DESIGN_HEIGHT);
  }

  return resolveTvViewportLayout(window.innerWidth, window.innerHeight);
}

export function useTvViewportLayout() {
  const [layout, setLayout] = useState<TvViewportLayout>(() => readWindowLayout());

  useEffect(() => {
    let animationFrameId = 0;

    const updateLayout = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(() => {
        setLayout(readWindowLayout());
      });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", updateLayout);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("orientationchange", updateLayout);
    };
  }, []);

  return layout;
}
