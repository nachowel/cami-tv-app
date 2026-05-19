const IMAGE_PATH_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

export interface DonationSlideImage {
  imageUrl: string;
  showQr: boolean;
  durationSeconds?: number;
}

export function clampSlideshowIntervalSeconds(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 30;
  }

  return Math.max(10, Math.min(300, value));
}

export function clampSlideDurationSeconds(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return -1;
  }

  return Math.max(3, Math.min(300, Math.round(value)));
}

export function normalizeSlideImageUrls(value: unknown) {
  return normalizeSlideImages(value).map((slide) => slide.imageUrl);
}

export function normalizeSlideImages(value: unknown): DonationSlideImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: DonationSlideImage[] = [];

  for (const item of value) {
    const imageUrl =
      typeof item === "string"
        ? item.trim()
        : typeof item === "object" && item !== null && "imageUrl" in item && typeof item.imageUrl === "string"
          ? item.imageUrl.trim()
          : "";

    if (!imageUrl || seen.has(imageUrl)) {
      continue;
    }

    seen.add(imageUrl);
    result.push({
      imageUrl,
      showQr:
        typeof item === "object" && item !== null && "showQr" in item && typeof item.showQr === "boolean"
          ? item.showQr
          : true,
      durationSeconds:
        typeof item === "object" && item !== null && "durationSeconds" in item
          ? clampSlideDurationSeconds(item.durationSeconds)
          : -1,
    });
  }

  return result;
}

export function isHttpImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      IMAGE_PATH_PATTERN.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function resolveDonationSlideshowImages(input: {
  backgroundImageUrl: string;
  backgroundShowQr?: boolean;
  backgroundSlideDurationSeconds?: number;
  slideImages?: DonationSlideImage[];
  slideImageUrls?: string[];
  slideDurationSeconds?: number;
}) {
  const result: DonationSlideImage[] = [];
  const seen = new Set<string>();
  const backgroundImageUrl = input.backgroundImageUrl.trim();
  const globalDuration = clampSlideDurationSeconds(input.slideDurationSeconds);
  const backgroundDuration = input.backgroundSlideDurationSeconds !== undefined
    ? clampSlideDurationSeconds(input.backgroundSlideDurationSeconds)
    : globalDuration;

  if (isHttpImageUrl(backgroundImageUrl)) {
    seen.add(backgroundImageUrl);
    result.push({
      imageUrl: backgroundImageUrl,
      showQr: input.backgroundShowQr !== false,
      durationSeconds: backgroundDuration >= 3 ? backgroundDuration : 30,
    });
  }

  const candidates = [
    ...normalizeSlideImages(input.slideImages),
    ...normalizeSlideImages(input.slideImageUrls),
  ];

  for (const candidate of candidates) {
    const trimmed = candidate.imageUrl.trim();
    if (!isHttpImageUrl(trimmed) || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    result.push({
      imageUrl: trimmed,
      showQr: candidate.showQr !== false,
      durationSeconds: (candidate.durationSeconds ?? -1) >= 3 ? (candidate.durationSeconds ?? -1) : (globalDuration >= 3 ? globalDuration : 30),
    });
  }

  return result;
}

export function shouldShowQrForDonationSlide(slide: DonationSlideImage | null | undefined) {
  return slide?.showQr === true;
}
