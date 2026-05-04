import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "../../i18n/useTranslation";
import type { DisplayLanguage, DonationCurrent } from "../../types/display";

interface DonationPanelProps {
  donation: DonationCurrent;
  language: DisplayLanguage;
}

export function DonationPanel({ donation, language }: DonationPanelProps) {
  const { t } = useTranslation(language);
  const formattedAmount = new Intl.NumberFormat("en-GB", {
    currency: donation.currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(donation.weekly_amount);
  const donationUrlLabel = donation.donation_url.replace(/^https?:\/\//, "");
  const donationTitle =
    language === "en" ? (
      <>
        <span className="block">LAST WEEK</span>
        <span className="block">DONATION</span>
      </>
    ) : (
      t("weekly_donations")
    );

  return (
    <section
      className="grid min-h-0 items-center gap-[clamp(0.55rem,0.8vw,1.1rem)] overflow-hidden rounded-2xl bg-white px-[clamp(0.85rem,1.25vw,1.5rem)] pt-[clamp(0.55rem,0.75vw,0.82rem)] pb-[clamp(0.9rem,1.2vw,1.3rem)] shadow-[0_12px_35px_rgba(21,54,35,0.10)]"
      style={{ gridTemplateColumns: "minmax(0,1fr) clamp(8.2rem,13.2vw,10.3rem)" }}
    >
      <div className="min-w-0 text-left">
        <p className="text-[clamp(0.92rem,1.45vw,1.45rem)] font-black uppercase leading-tight tracking-[0.06em] text-emerald-800">
          {donationTitle}
        </p>
        <p className="mt-[clamp(0.2rem,0.45vw,0.45rem)] text-[clamp(1.9rem,3.2vw,3.2rem)] font-black leading-none tracking-normal text-emerald-800">
          {formattedAmount}
        </p>
        <p className="mt-[clamp(0.18rem,0.35vw,0.35rem)] max-w-md text-[clamp(0.62rem,0.8vw,0.86rem)] font-medium leading-snug text-slate-600">
          {t("scan_to_donate")}
        </p>
      </div>

      <div className="flex h-full w-full flex-col items-center justify-start gap-[clamp(0.22rem,0.35vw,0.42rem)] pt-[clamp(0.08rem,0.18vw,0.14rem)]">
        <div className="aspect-square w-[clamp(5.9rem,8.4vw,7.2rem)] rounded-2xl border border-emerald-900/10 bg-white p-[clamp(0.22rem,0.38vw,0.42rem)] shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
          <QRCodeSVG
            className="h-full w-full"
            bgColor="#ffffff"
            fgColor="#042f24"
            level="M"
            marginSize={1}
            size={160}
            value={donation.donation_url}
          />
        </div>
        <p className="flex min-h-[clamp(1.7rem,2.2vw,2rem)] w-full min-w-[clamp(7.2rem,11.5vw,8.9rem)] max-w-full items-center justify-center self-stretch rounded-lg bg-emerald-800 px-[clamp(0.5rem,0.72vw,0.84rem)] py-[clamp(0.22rem,0.3vw,0.34rem)] text-center text-[clamp(0.3rem,0.38vw,0.42rem)] font-bold leading-none whitespace-nowrap text-white">
          {donationUrlLabel}
        </p>
      </div>
    </section>
  );
}
