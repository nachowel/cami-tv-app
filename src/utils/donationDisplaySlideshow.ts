const IMAGE_PATH_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

export interface DonationSlideImage {
  imageUrl: string;
  showQr: boolean;
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

export function clampSlideshowIntervalSeconds(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 30;
  }

  return Math.max(10, Math.min(300, value));
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
    });
  }

  return result;
}

export function resolveDonationSlideshowImages(input: {
  backgroundImageUrl: string;
  backgroundShowQr?: boolean;
  slideImages?: DonationSlideImage[];
  slideImageUrls?: string[];
}) {
  const result: DonationSlideImage[] = [];
  const seen = new Set<string>();
  const backgroundImageUrl = input.backgroundImageUrl.trim();

  if (isHttpImageUrl(backgroundImageUrl)) {
    seen.add(backgroundImageUrl);
    result.push({
      imageUrl: backgroundImageUrl,
      showQr: input.backgroundShowQr !== false,
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
    });
  }

  return result;
}

export function shouldShowQrForDonationSlide(slide: DonationSlideImage | null | undefined) {
  return slide?.showQr === true;
}
