import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import { AdminSectionCard } from "./AdminSectionCard";
import { DONATION_DISPLAY_PRESETS } from "./donationDisplayPresets";
import { resolveDonationSlideshowImages, type DonationSlideImage } from "../../utils/donationDisplaySlideshow";

export interface DonationImageUploadState {
  error: string | null;
  uploading: boolean;
}

interface DonationDisplaySettingsSectionProps {
  id?: string;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  status: SectionStatus | null;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  mainMessage: string;
  ctaText: string;
  qrUrl: string;
  qrUrlError?: string;
  impactText: string;
  showImpactText: boolean;
  showQrCode: boolean;
  displayMode: "component" | "image";
  backgroundImageUrl: string;
  backgroundImageUrlError?: string;
  backgroundImageUploadState: DonationImageUploadState;
  qrOverlayEnabled: boolean;
  qrOverlayXPercent: number;
  qrOverlayYPercent: number;
  qrOverlaySizePercent: number;
  motionEnabled: boolean;
  slideshowEnabled: boolean;
  slideshowIntervalSeconds: number;
  backgroundSlideDurationSeconds: number;
  slideImages: DonationSlideImage[];
  slideImageUrlErrors?: Array<string | undefined>;
  slideImageUploadStates: DonationImageUploadState[];
  onTitleLine1Change: (value: string) => void;
  onTitleLine2Change: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onMainMessageChange: (value: string) => void;
  onCtaTextChange: (value: string) => void;
  onQrUrlChange: (value: string) => void;
  onImpactTextChange: (value: string) => void;
  onShowImpactTextChange: (value: boolean) => void;
  onShowQrCodeChange: (value: boolean) => void;
  onDisplayModeChange: (value: "component" | "image") => void;
  onBackgroundImageUrlChange: (value: string) => void;
  onBackgroundImageUpload: (file: File) => void;
  onQrOverlayEnabledChange: (value: boolean) => void;
  onQrOverlayXPercentChange: (value: number) => void;
  onQrOverlayYPercentChange: (value: number) => void;
  onQrOverlaySizePercentChange: (value: number) => void;
  onMotionEnabledChange: (value: boolean) => void;
  onSlideshowEnabledChange: (value: boolean) => void;
  onSlideshowIntervalSecondsChange: (value: number) => void;
  onBackgroundSlideDurationSecondsChange: (value: number) => void;
  onSlideImageUrlChange: (index: number, value: string) => void;
  onSlideImageShowQrChange: (index: number, value: boolean) => void;
  onSlideImageDurationSecondsChange: (index: number, value: number) => void;
  onSlideImageUpload: (index: number, file: File) => void;
  onAddSlideImageUrl: () => void;
  onRemoveSlideImageUrl: (index: number) => void;
  onMoveSlideImageUrl: (index: number, direction: -1 | 1) => void;
  onPresetSelect: (presetId: string) => void;
  onReset: () => void;
  onSubmit: () => void;
}

export function DonationDisplaySettingsSection({
  id,
  mobileOpen,
  onMobileToggle,
  status,
  titleLine1,
  titleLine2,
  subtitle,
  mainMessage,
  ctaText,
  qrUrl,
  qrUrlError,
  impactText,
  showImpactText,
  showQrCode,
  displayMode,
  backgroundImageUrl,
  backgroundImageUrlError,
  backgroundImageUploadState,
  qrOverlayEnabled,
  qrOverlayXPercent,
  qrOverlayYPercent,
  qrOverlaySizePercent,
  motionEnabled,
  slideshowEnabled,
  slideshowIntervalSeconds,
  backgroundSlideDurationSeconds,
  slideImages,
  slideImageUrlErrors,
  slideImageUploadStates,
  onTitleLine1Change,
  onTitleLine2Change,
  onSubtitleChange,
  onMainMessageChange,
  onCtaTextChange,
  onQrUrlChange,
  onImpactTextChange,
  onShowImpactTextChange,
  onShowQrCodeChange,
  onDisplayModeChange,
  onBackgroundImageUrlChange,
  onBackgroundImageUpload,
  onQrOverlayEnabledChange,
  onQrOverlayXPercentChange,
  onQrOverlayYPercentChange,
  onQrOverlaySizePercentChange,
  onMotionEnabledChange,
  onSlideshowEnabledChange,
  onSlideshowIntervalSecondsChange,
  onBackgroundSlideDurationSecondsChange,
  onSlideImageUrlChange,
  onSlideImageShowQrChange,
  onSlideImageDurationSecondsChange,
  onSlideImageUpload,
  onAddSlideImageUrl,
  onRemoveSlideImageUrl,
  onMoveSlideImageUrl,
  onPresetSelect,
  onReset,
  onSubmit,
}: DonationDisplaySettingsSectionProps) {
  const isImageMode = displayMode === "image";
  const [slideshowPreviewIndex, setSlideshowPreviewIndex] = useState(0);
  const slideshowPreviewImages = useMemo(
    () =>
      resolveDonationSlideshowImages({
        backgroundImageUrl,
        backgroundShowQr: showQrCode,
        backgroundSlideDurationSeconds,
        slideImages,
        slideDurationSeconds: slideshowIntervalSeconds,
      }),
    [backgroundImageUrl, showQrCode, backgroundSlideDurationSeconds, slideImages, slideshowIntervalSeconds],
  );
  const slideshowPreviewImageUrls = slideshowPreviewImages.map((slide) => slide.imageUrl);
  const previewImageUrl =
    slideshowEnabled && slideshowPreviewImageUrls.length > 0
      ? slideshowPreviewImageUrls[slideshowPreviewIndex % slideshowPreviewImageUrls.length]
      : backgroundImageUrl.trim();
  const previewSlideCount = slideshowEnabled ? Math.max(slideshowPreviewImageUrls.length, 1) : 1;
  const previewSlideNumber = slideshowEnabled && slideshowPreviewImageUrls.length > 0
    ? (slideshowPreviewIndex % slideshowPreviewImageUrls.length) + 1
    : 1;
  const hasPreviewImage = (isImageMode && previewImageUrl.length > 0) || (isImageMode && backgroundImageUrl.trim().length > 0);

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function handlePreviewStep(direction: -1 | 1) {
    if (slideshowPreviewImageUrls.length <= 0) {
      setSlideshowPreviewIndex(0);
      return;
    }

    setSlideshowPreviewIndex((current) =>
      (current + direction + slideshowPreviewImageUrls.length) % slideshowPreviewImageUrls.length,
    );
  }
  return (
    <AdminSectionCard
      id={id}
      mobileOpen={mobileOpen}
      onMobileToggle={onMobileToggle}
      title="Donation Display"
      description="Customize the donation TV screen content."
    >
      {/* Display content type selector */}
      <div className="mb-4">
        <span className="text-sm font-semibold text-slate-700">Display content type</span>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              checked={displayMode === "component"}
              className="h-4 w-4 border-slate-300 text-emerald-700"
              onChange={() => onDisplayModeChange("component")}
              type="radio"
            />
            <span className="text-sm font-semibold text-slate-700">Custom message</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              checked={displayMode === "image"}
              className="h-4 w-4 border-slate-300 text-emerald-700"
              onChange={() => onDisplayModeChange("image")}
              type="radio"
            />
            <span className="text-sm font-semibold text-slate-700">Image / slideshow</span>
          </label>
        </div>
      </div>

      {/* QR URL — available in BOTH modes */}
      <label className="block sm:col-span-2">
        <span className="text-sm font-semibold text-slate-700">QR URL</span>
        <input
          className={`mt-2 min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
            qrUrlError ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
          }`}
          onChange={(event) => onQrUrlChange(event.target.value)}
          placeholder="https://example.org/donate"
          type="url"
          value={qrUrl}
        />
        {qrUrlError ? <p className="mt-2 text-sm font-medium text-red-700">{qrUrlError}</p> : null}
      </label>

      {/* CUSTOM MESSAGE MODE */}
      {displayMode === "component" && (
        <>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Message Preset</span>
            <select
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
              onChange={(event) => onPresetSelect(event.target.value)}
              value=""
            >
              <option value="">
                Select a preset...
              </option>
              {DONATION_DISPLAY_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                checked={motionEnabled}
                className="h-5 w-5 rounded border-slate-300 text-emerald-700"
                onChange={(event) => onMotionEnabledChange(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm font-semibold text-slate-700">Enable motion/animations</span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Title Line 1</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => onTitleLine1Change(event.target.value)}
                type="text"
                value={titleLine1}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Title Line 2</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => onTitleLine2Change(event.target.value)}
                type="text"
                value={titleLine2}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Subtitle</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => onSubtitleChange(event.target.value)}
                type="text"
                value={subtitle}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Main Message</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => onMainMessageChange(event.target.value)}
                type="text"
                value={mainMessage}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">CTA Text</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => onCtaTextChange(event.target.value)}
                type="text"
                value={ctaText}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Impact Text (optional)</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => onImpactTextChange(event.target.value)}
                placeholder="£350 raised last Friday"
                type="text"
                value={impactText}
              />
            </label>

            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  checked={showQrCode}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-700"
                  onChange={(event) => onShowQrCodeChange(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm font-semibold text-slate-700">Show QR code</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  checked={showImpactText}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-700"
                  onChange={(event) => onShowImpactTextChange(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm font-semibold text-slate-700">Show impact text</span>
              </label>
            </div>
          </div>

          {/* Component preview */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Preview</p>
            <div className="mx-auto max-w-md">
              <div className="relative w-full overflow-hidden rounded-lg border border-emerald-900/10 bg-gradient-to-br from-[#fdfbf7] to-[#ece5d4] shadow-sm">
                <div className="relative pb-[56.25%]">
                  <div className="absolute inset-0 flex flex-col items-center justify-between px-4 py-3 text-center sm:px-6 sm:py-4">
                    <div>
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-[#14201d] sm:text-xs">
                        {(titleLine1 || "DONATE").toUpperCase()}
                      </p>
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-[#14201d] sm:text-xs">
                        {(titleLine2 || "HERE TODAY").toUpperCase()}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <p className="max-w-[90%] text-[0.55rem] font-medium leading-tight text-[#3d524a] sm:text-[0.6rem]">
                        {subtitle || "Without your donation, this masjid cannot continue."}
                      </p>
                      <p className="text-[0.55rem] font-bold uppercase tracking-wide text-emerald-800 sm:text-[0.6rem]">
                        {(ctaText || "GIVE NOW").toUpperCase()}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {showQrCode ? (
                        qrUrl.trim().length > 0 && !qrUrlError ? (
                          <div className="rounded border border-slate-200 bg-white p-1">
                            <QRCodeSVG size={56} value={qrUrl.trim()} />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[0.5rem] text-red-600">
                            Invalid QR
                          </div>
                        )
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[0.5rem] text-slate-400">
                          QR Hidden
                        </div>
                      )}
                      {showImpactText && impactText.trim().length > 0 ? (
                        <p className="max-w-[90%] text-[0.5rem] font-semibold text-[#14201d]/80 sm:text-[0.55rem]">
                          {impactText}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-[0.65rem] font-medium text-emerald-700">
                  Mode: Custom message
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[0.65rem] font-medium text-slate-600">
                  Motion: {motionEnabled ? "On" : "Off"}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-[0.65rem] font-medium ${
                    showQrCode
                      ? qrUrlError
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  QR: {showQrCode ? (qrUrlError ? "Invalid" : "Visible") : "Hidden"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* IMAGE / SLIDESHOW MODE */}
      {displayMode === "image" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Background Image URL</span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className={`min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                    backgroundImageUrlError ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
                  }`}
                  onChange={(event) => onBackgroundImageUrlChange(event.target.value)}
                  placeholder="https://example.org/donation-bg.jpg"
                  type="url"
                  value={backgroundImageUrl}
                />
                <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${backgroundImageUploadState.uploading ? "pointer-events-none opacity-60" : ""}`}>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={backgroundImageUploadState.uploading}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) {
                        onBackgroundImageUpload(file);
                      }
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                  {backgroundImageUploadState.uploading ? "Uploading..." : "Upload image"}
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">Use a 16:9 image for best TV fit.</p>
              {backgroundImageUrlError ? <p className="mt-2 text-sm font-medium text-red-700">{backgroundImageUrlError}</p> : null}
              {backgroundImageUploadState.error ? <p className="mt-2 text-sm font-medium text-red-700">{backgroundImageUploadState.error}</p> : null}
            </div>

            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                checked={slideshowEnabled}
                className="h-5 w-5 rounded border-slate-300 text-emerald-700"
                onChange={(event) => onSlideshowEnabledChange(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm font-semibold text-slate-700">Enable slideshow</span>
            </label>
          </div>

          {slideshowEnabled && (
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">Slideshow images</span>
                <button
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={onAddSlideImageUrl}
                  type="button"
                >
                  Add image
                </button>
              </div>

              {/* Slide 1 - Main background */}
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Slide 1 — Main background</span>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                    onChange={(event) => onBackgroundImageUrlChange(event.target.value)}
                    placeholder="https://example.org/background.jpg"
                    type="url"
                    value={backgroundImageUrl}
                  />
                  <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${backgroundImageUploadState.uploading ? "pointer-events-none opacity-60" : ""}`}>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={backgroundImageUploadState.uploading}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) {
                          onBackgroundImageUpload(file);
                        }
                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />
                    {backgroundImageUploadState.uploading ? "Uploading..." : "Upload image"}
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-slate-500">Duration (seconds)</span>
                  <input
                    className="mt-1 min-h-9 w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-700"
                    inputMode="numeric"
                    max={300}
                    min={3}
                    onChange={(event) => onBackgroundSlideDurationSecondsChange(clamp(Number(event.target.value), 3, 300))}
                    type="number"
                    value={backgroundSlideDurationSeconds}
                  />
                  <span className="ml-2 text-xs text-slate-400">3–300 seconds</span>
                </label>
              </div>

              {/* Extra slides */}
              {slideImages.map((slideImage, index) => {
                const slideImageUploadState = slideImageUploadStates[index] ?? { error: null, uploading: false };

                return (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3" key={index}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{`Slide ${index + 2}`}</span>
                      <button
                        className="min-h-7 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        onClick={() => onRemoveSlideImageUrl(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        className={`min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                          slideImageUrlErrors?.[index] ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
                        }`}
                        onChange={(event) => onSlideImageUrlChange(index, event.target.value)}
                        placeholder="https://example.org/donation-slide.jpg"
                        type="url"
                        value={slideImage.imageUrl}
                      />
                      <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${slideImageUploadState.uploading ? "pointer-events-none opacity-60" : ""}`}>
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={slideImageUploadState.uploading}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) {
                              onSlideImageUpload(index, file);
                            }
                            event.currentTarget.value = "";
                          }}
                          type="file"
                        />
                        {slideImageUploadState.uploading ? "Uploading..." : "Upload image"}
                      </label>
                    </div>
                    {slideImageUrlErrors?.[index] ? <p className="mt-2 text-sm font-medium text-red-700">{slideImageUrlErrors[index]}</p> : null}
                    {slideImageUploadState.error ? <p className="mt-2 text-sm font-medium text-red-700">{slideImageUploadState.error}</p> : null}
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          checked={slideImage.showQr}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                          onChange={(event) => onSlideImageShowQrChange(index, event.target.checked)}
                          type="checkbox"
                        />
                        <span className="text-sm font-semibold text-slate-700">Show QR</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Duration</span>
                        <input
                          className="min-h-8 w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-700"
                          inputMode="numeric"
                          max={300}
                          min={3}
                          onChange={(event) => onSlideImageDurationSecondsChange(index, clamp(Number(event.target.value), 3, 300))}
                          type="number"
                          value={slideImage.durationSeconds ?? ""}
                        />
                        <span className="text-xs text-slate-400">sec (3–300)</span>
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="min-h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={index === 0}
                        onClick={() => onMoveSlideImageUrl(index, -1)}
                        type="button"
                      >
                        Up
                      </button>
                      <button
                        className="min-h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={index === slideImages.length - 1}
                        onClick={() => onMoveSlideImageUrl(index, 1)}
                        type="button"
                      >
                        Down
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Fallback duration helper */}
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                  Advanced: fallback duration for slides without custom duration
                </summary>
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Default fallback:</span>
                    <input
                      className="min-h-8 w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-700"
                      inputMode="numeric"
                      max={300}
                      min={3}
                      onChange={(event) => onSlideshowIntervalSecondsChange(clamp(Number(event.target.value), 3, 300))}
                      type="number"
                      value={slideshowIntervalSeconds}
                    />
                    <span className="text-xs text-slate-400">sec</span>
                  </label>
                  <span className="text-xs text-slate-400">3–300 seconds</span>
                </div>
              </details>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                checked={qrOverlayEnabled}
                className="h-5 w-5 rounded border-slate-300 text-emerald-700"
                onChange={(event) => onQrOverlayEnabledChange(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm font-semibold text-slate-700">QR overlay</span>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Overlay X %</span>
            <input
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              inputMode="numeric"
              max={100}
              min={0}
              onChange={(event) => onQrOverlayXPercentChange(clamp(Number(event.target.value), 0, 100))}
              type="number"
              value={qrOverlayXPercent}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Overlay Y %</span>
            <input
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              inputMode="numeric"
              max={100}
              min={0}
              onChange={(event) => onQrOverlayYPercentChange(clamp(Number(event.target.value), 0, 100))}
              type="number"
              value={qrOverlayYPercent}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Overlay Size %</span>
            <input
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              inputMode="numeric"
              max={30}
              min={5}
              onChange={(event) => onQrOverlaySizePercentChange(clamp(Number(event.target.value), 5, 30))}
              type="number"
              value={qrOverlaySizePercent}
            />
          </label>

          {/* Image/slideshow preview */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Preview</p>
            <div className="mx-auto max-w-md">
              <div className="relative w-full overflow-hidden rounded-lg border border-emerald-900/10 bg-gradient-to-br from-[#fdfbf7] to-[#ece5d4] shadow-sm">
                <div className="relative pb-[56.25%]">
                  {hasPreviewImage ? (
                    <div className="absolute inset-0">
                      <img alt="" className="h-full w-full object-contain" src={previewImageUrl} />
                      {qrOverlayEnabled && showQrCode && qrUrl.trim().length > 0 && !qrUrlError && (
                        <div
                          className="absolute"
                          style={{
                            left: `calc(${qrOverlayXPercent}% - ${(qrOverlaySizePercent / 100) * 28}px)`,
                            top: `calc(${qrOverlayYPercent}% - ${(qrOverlaySizePercent / 100) * 28}px)`,
                            width: `${(qrOverlaySizePercent / 100) * 56}px`,
                            height: `${(qrOverlaySizePercent / 100) * 56}px`,
                          }}
                        >
                          <QRCodeSVG className="h-full w-full" size={Math.round((qrOverlaySizePercent / 100) * 56)} value={qrUrl.trim()} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[0.6rem] text-slate-400">
                      No background image
                    </div>
                  )}
                </div>
              </div>

              {slideshowEnabled ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={slideshowPreviewImageUrls.length <= 1}
                    onClick={() => handlePreviewStep(-1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <p className="text-sm font-semibold text-slate-700">Slide {previewSlideNumber} of {previewSlideCount}</p>
                  <span aria-hidden="true" className="sr-only">Slide 1 of {previewSlideCount}</span>
                  <button
                    className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={slideshowPreviewImageUrls.length <= 1}
                    onClick={() => handlePreviewStep(1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-[0.65rem] font-medium text-blue-700">
                  Mode: Image / slideshow
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[0.65rem] font-medium text-slate-600">
                  Slideshow: {slideshowEnabled ? "On" : "Off"}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-[0.65rem] font-medium ${
                    showQrCode
                      ? qrUrlError
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  QR: {showQrCode ? (qrUrlError ? "Invalid" : "Visible") : "Hidden"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-sm text-slate-600 sm:block">Changes are saved to Firestore immediately.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            onClick={onReset}
            type="button"
          >
            Reset to default
          </button>
          <button
            className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(qrUrlError)}
            onClick={onSubmit}
            type="button"
          >
            Save donation display
          </button>
        </div>
      </div>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
