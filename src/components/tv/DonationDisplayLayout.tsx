import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { DonationDisplayConfig } from "../../types/display";
import { useTvViewportLayout } from "./tvViewportLayout";
import { resolveDonationTitleLines } from "../../utils/donationDisplayFallback";

interface DonationDisplayLayoutProps {
  config: DonationDisplayConfig;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function DonationDisplayLayout({ config }: DonationDisplayLayoutProps) {
  const viewportLayout = useTvViewportLayout();

  // Defensive: never render nothing
  const safeConfig = config ?? {
    enabled: true,
    headline: "DONATE HERE TODAY",
    message: "Without your donation, this masjid stops.",
    cta: "Cash or Card Accepted Here ↓",
    qrLabel: "Prefer online? Scan",
    titleLine1: "DONATE",
    titleLine2: "HERE TODAY",
    subtitle: "Without your donation, this masjid cannot continue.",
    mainMessage: "THIS MASJID CANNOT CONTINUE",
    ctaText: "GIVE NOW — CASH OR CARD ↓",
    qrUrl: "https://www.icmgbexley.org.uk/donation",
    backgroundImageUrl: "",
    impactText: "",
    showImpactText: false,
    showQrCode: true,
    displayMode: "component" as const,
    qrOverlayEnabled: true,
    qrOverlayXPercent: 82,
    qrOverlayYPercent: 67,
    qrOverlaySizePercent: 12,
    motionEnabled: true,
  };

  const stageHeight = viewportLayout?.stageHeight ?? 1080;
  const stageWidth = viewportLayout?.stageWidth ?? 1920;
  const hasQrUrl = safeConfig.showQrCode !== false && typeof safeConfig.qrUrl === "string" && safeConfig.qrUrl.trim().length > 0;
  const hasBackgroundImage = typeof safeConfig.backgroundImageUrl === "string" && safeConfig.backgroundImageUrl.length > 0;
  const motion = safeConfig.motionEnabled !== false;

  // ── Countdown state for QR ──
  const [countdown, setCountdown] = useState(10);
  const [qrFading, setQrFading] = useState(false);

  useEffect(() => {
    if (!motion) return;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Soft pulse: opacity 1 → 0.75 → 1 over 800ms
          setQrFading(true);
          timeoutId = setTimeout(() => {
            setQrFading(false);
          }, 400);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timer);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [motion]);

  // Use new config fields with safe legacy fallbacks
  const { titleLine1, titleLine2 } = resolveDonationTitleLines(safeConfig);
  const subtitleText = safeConfig.subtitle || safeConfig.message || "Without your donation, this masjid cannot continue.";
  const ctaDisplay = (safeConfig.ctaText || safeConfig.cta || "GIVE NOW — CASH OR CARD ↓").toUpperCase();

  if (safeConfig.enabled === false) {
    return (
      <main
        className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#f5f3ea] text-[#14201d]"
        style={{ height: "100dvh" }}
      >
        <div
          className="flex aspect-[16/9] flex-col items-center justify-center overflow-hidden rounded-[1.35rem] border border-emerald-900/10 bg-[#fffdf7] shadow-[0_18px_55px_rgba(21,54,35,0.14)]"
          style={{
            height: `${stageHeight}px`,
            width: `${stageWidth}px`,
          }}
        >
          <p
            className="font-black uppercase tracking-[0.08em] text-emerald-800"
            style={{ fontSize: `${stageWidth * 0.04}px` }}
          >
            Donation display disabled
          </p>
        </div>
      </main>
    );
  }

  // ── Image mode ──
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const isImageMode = safeConfig.displayMode === "image" && hasBackgroundImage && !imageLoadFailed;

  if (isImageMode) {
    const qrSize = stageWidth * (clamp(safeConfig.qrOverlaySizePercent, 5, 30) / 100);
    const qrLeft = stageWidth * (clamp(safeConfig.qrOverlayXPercent, 0, 100) / 100) - qrSize / 2;
    const qrTop = stageHeight * (clamp(safeConfig.qrOverlayYPercent, 0, 100) / 100) - qrSize / 2;

    return (
      <main
        className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#f5f3ea] text-[#14201d]"
        style={{ height: "100dvh" }}
      >
        <div
          className="relative flex aspect-[16/9] overflow-hidden rounded-[1.35rem] border border-emerald-900/10 bg-[#fffdf7] shadow-[0_18px_55px_rgba(21,54,35,0.14)]"
          style={{
            height: `${stageHeight}px`,
            width: `${stageWidth}px`,
          }}
        >
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            onError={() => {
              console.warn("[donation] Background image failed to load; falling back to component mode.");
              setImageLoadFailed(true);
            }}
            src={safeConfig.backgroundImageUrl}
          />
          {safeConfig.qrOverlayEnabled && hasQrUrl && (
            <div
              className="absolute"
              style={{
                left: `${qrLeft}px`,
                top: `${qrTop}px`,
                width: `${qrSize}px`,
                height: `${qrSize}px`,
              }}
            >
              <QRCodeSVG className="h-full w-full" bgColor="#ffffff" fgColor="#000000" level="M" marginSize={0} size={Math.round(qrSize)} value={safeConfig.qrUrl} />
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#f5f3ea] text-[#14201d]"
      style={{ height: "100dvh" }}
    >
      {/* ── Animation keyframes (no layout impact) ── */}
      <style>{`
        @keyframes donatePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.015); }
        }
        @keyframes arrowBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
        @keyframes shimmerSweep {
          0%, 35% { background-position: 200% center; }
          65%, 100% { background-position: -200% center; }
        }
      `}</style>

      <div
        className="relative flex aspect-[16/9] overflow-hidden rounded-[1.35rem] border border-emerald-900/10 bg-gradient-to-br from-[#fdfbf7] to-[#ece5d4] shadow-[0_18px_55px_rgba(21,54,35,0.14)]"
        style={{
          height: `${stageHeight}px`,
          width: `${stageWidth}px`,
        }}
      >
        {/* ── Background image (Silhouette) ── */}
        {hasBackgroundImage && (
          <img
            alt=""
            className="pointer-events-none absolute bottom-0 right-0 h-full w-full object-cover object-right mix-blend-multiply"
            src={safeConfig.backgroundImageUrl}
            style={{ opacity: 0.12 }}
          />
        )}

        <div className="relative z-10 flex h-full w-full flex-col px-[6%] pb-[3.5%] pt-[6%]">

          {/* ── Top Area: Headline & Message ── */}
          <div className="flex flex-col items-center justify-start pt-[2%]">
            {/* Headline */}
            <div className="flex flex-col items-center text-center leading-[0.85]">
              <h1
                className="font-black text-[#042f24]"
                style={{ fontSize: `${stageWidth * 0.115}px`, letterSpacing: "0.22em", marginLeft: "0.22em" }}
              >
                <span
                  style={{
                    animation: motion ? "donatePulse 4.5s ease-in-out infinite" : undefined,
                    animationDelay: "1.5s",
                    display: "inline-block",
                    willChange: motion ? "transform" : undefined,
                  }}
                >
                  {titleLine1}
                </span>
              </h1>
              <h1
                className="font-black"
                style={{
                  fontSize: `${stageWidth * 0.08}px`,
                  letterSpacing: "-0.01em",
                  backgroundImage: motion
                    ? "linear-gradient(90deg, #b48629 0%, #FFD700 40%, #FFF8DC 50%, #FFD700 60%, #b48629 100%)"
                    : undefined,
                  backgroundSize: "200% 100%",
                  WebkitBackgroundClip: motion ? "text" : undefined,
                  backgroundClip: motion ? "text" : undefined,
                  color: motion ? "transparent" : "#b48629",
                  animation: motion ? "shimmerSweep 5s ease-in-out infinite" : undefined,
                  willChange: motion ? "background-position" : undefined,
                }}
              >
                {titleLine2}
              </h1>
            </div>

            {/* Message */}
            <div className="mt-[4%] flex flex-col items-center text-center leading-[1.2]">
              <p
                className="font-semibold text-[#1c1917]"
                style={{ fontSize: `${stageWidth * 0.024}px`, letterSpacing: "0.05em" }}
              >
                {subtitleText}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* ── Bottom Area: CTA & QR Row ── */}
          <div className="flex w-full items-end justify-between">
            {/* LEFT: CTA Button */}
            <div className="flex w-[52%] items-center justify-between rounded-[1rem] bg-[#042f24] px-[3%] py-[1.8%] shadow-xl">
              {/* Card Icon */}
              <svg
                className="text-white opacity-90"
                style={{ width: `${stageWidth * 0.05}px`, height: `${stageWidth * 0.05}px` }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>

              {/* Vertical Divider */}
              <div className="mx-[3%] w-[2px] bg-white/20" style={{ height: `${stageWidth * 0.04}px` }} />

              {/* CTA Text */}
              <div className="flex flex-1 flex-col items-start justify-center leading-[1.15]">
                {(() => {
                  const parts = ctaDisplay.replace("↓", "").split(/[—-]/);
                  return (
                    <>
                      <p className="font-bold text-white" style={{ fontSize: `${stageWidth * 0.024}px`, letterSpacing: "0.02em" }}>
                        {parts[0]?.trim() || "GIVE NOW"}
                      </p>
                      {parts[1] && (
                        <p className="font-bold text-[#b48629]" style={{ fontSize: `${stageWidth * 0.018}px`, letterSpacing: "0.04em" }}>
                          {parts[1].trim()}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Arrow Down */}
              <svg
                className="text-[#b48629]"
                fill="none"
                style={{
                  animation: motion ? "arrowBounce 4s ease-in-out infinite" : undefined,
                  width: `${stageWidth * 0.052}px`,
                  height: `${stageWidth * 0.052}px`,
                }}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* RIGHT: QR Block */}
            {hasQrUrl && (
              <div className="relative flex flex-col items-center gap-2">
                {/* Optional Top Label */}
                <div className="mb-1 flex items-center gap-2">
                  <svg className="text-[#042f24]/70" style={{ width: `${stageWidth * 0.012}px`, height: `${stageWidth * 0.012}px` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <p className="font-bold tracking-wide text-[#042f24]/70" style={{ fontSize: `${stageWidth * 0.011}px` }}>
                    PREFER ONLINE? <span className="text-[#b48629]/80">SCAN</span>
                  </p>
                </div>

                {/* QR Code Container with soft pulse transition */}
                <div
                  className="rounded-[1.5rem] border-[3px] border-[#042f24] bg-white p-5 shadow-md"
                  style={{
                    width: `${stageWidth * 0.12}px`,
                    height: `${stageWidth * 0.12}px`,
                    opacity: motion && qrFading ? 0.75 : 1,
                    transition: motion ? "opacity 800ms ease-in-out" : undefined,
                  }}
                >
                  <QRCodeSVG className="h-full w-full" bgColor="#ffffff" fgColor="#000000" level="M" marginSize={0} size={200} value={safeConfig.qrUrl} />
                </div>

                {/* Bottom QR Label */}
                <div className="mt-1 flex flex-col items-center text-center">
                  <p className="font-bold text-[#042f24]" style={{ fontSize: `${stageWidth * 0.016}px` }}>
                    SCAN TO DONATE
                  </p>
                  {motion && (
                    <p className="font-bold tracking-wider text-[#b48629]" style={{ fontSize: `${stageWidth * 0.011}px` }}>
                      IN {countdown} SECONDS
                    </p>
                  )}
                </div>

                {/* Optional impact text — only when enabled and non-empty */}
                {safeConfig.showImpactText && safeConfig.impactText && (
                  <p
                    className="absolute text-center font-medium text-[#042f24]/50"
                    style={{
                      top: "100%",
                      marginTop: `${stageWidth * 0.008}px`,
                      fontSize: `${stageWidth * 0.009}px`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {safeConfig.impactText}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}