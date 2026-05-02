export interface ShouldScrollTextOptions {
  containerWidth: number;
  textWidth: number;
  prefersReducedMotion: boolean;
}

export function shouldScrollText(options: ShouldScrollTextOptions): boolean {
  return options.textWidth > options.containerWidth + 1 && !options.prefersReducedMotion;
}

export interface ComputeScrollDurationOptions {
  textLength: number;
  speed?: number;
  pauseMs?: number;
}

const DEFAULT_SPEED = 45;
const DEFAULT_PAUSE_MS = 2000;
const MIN_SCROLL_SECONDS = 8;

export function computeScrollDuration(options: ComputeScrollDurationOptions): number {
  const speed = options.speed ?? DEFAULT_SPEED;
  const pauseMs = options.pauseMs ?? DEFAULT_PAUSE_MS;
  const scrollSeconds = Math.max(MIN_SCROLL_SECONDS, options.textLength / speed);
  return scrollSeconds + pauseMs / 1000;
}

export function computeHoldPercent(options: { pauseMs?: number; speed?: number; textLength: number }): number {
  const speed = options.speed ?? DEFAULT_SPEED;
  const pauseMs = options.pauseMs ?? DEFAULT_PAUSE_MS;
  const scrollSeconds = Math.max(MIN_SCROLL_SECONDS, options.textLength / speed);
  const totalSeconds = scrollSeconds + pauseMs / 1000;
  const holdFraction = pauseMs / 1000 / 2 / totalSeconds;
  return Math.min(20, Math.round(holdFraction * 100));
}

export function getReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}