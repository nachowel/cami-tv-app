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

  return (
    <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-2xl bg-white px-6 py-3 shadow-[0_12px_35px_rgba(21,54,35,0.10)] 2xl:gap-8 2xl:px-9 2xl:py-4">
      <div className="min-w-0 text-left">
        <p className="text-xl font-black uppercase leading-tight tracking-[0.06em] text-emerald-800 2xl:text-3xl">
          {t("weekly_donations")}
        </p>
        <p className="mt-2 text-5xl font-black leading-none tracking-normal text-emerald-800 2xl:mt-3 2xl:text-6xl">
          {formattedAmount}
        </p>
        <p className="mt-2 max-w-md text-xs font-medium leading-snug text-slate-600 2xl:mt-3 2xl:text-lg">
          {t("scan_to_donate")}
        </p>
      </div>

      <div className="flex w-52 flex-col items-center justify-center 2xl:w-64">
        <div className="rounded-2xl border border-emerald-900/10 bg-white p-2 shadow-[0_10px_28px_rgba(15,23,42,0.14)] 2xl:p-3">
          <QRCodeSVG
            className="h-32 w-32 2xl:h-36 2xl:w-36"
            bgColor="#ffffff"
            fgColor="#042f24"
            level="M"
            marginSize={1}
            size={160}
            value={donation.donation_url}
          />
        </div>
        <p className="mt-1.5 w-full truncate rounded-lg bg-emerald-800 px-3 py-1.5 text-center text-xs font-bold leading-tight text-white 2xl:mt-2 2xl:px-4 2xl:py-2 2xl:text-sm">
          {donation.donation_url.replace("https://", "")}
        </p>
      </div>
    </section>
  );
}
