import { useTranslation } from "../../i18n/useTranslation";
import type { DisplayLanguage, PrayerTimesCurrent, PrayerTimesForDay } from "../../types/display";
import type { TranslationKey } from "../../i18n/translations";
import type { PrayerName } from "../../utils/prayerTimes";

interface PrayerTimesPanelProps {
  prayerTimes: PrayerTimesCurrent;
  language: DisplayLanguage;
  highlightedPrayer: PrayerName;
}

const prayerLabels: Array<[keyof PrayerTimesForDay, TranslationKey]> = [
  ["fajr", "prayer_fajr"],
  ["sunrise", "prayer_sunrise"],
  ["dhuhr", "prayer_dhuhr"],
  ["asr", "prayer_asr"],
  ["maghrib", "prayer_maghrib"],
  ["isha", "prayer_isha"],
];

const prayerIcons = ["☾", "☀", "☀", "◒", "◐", "☾"];

function formatUpdateTime(isoDateTime: string): string {
  const match = isoDateTime.match(/T(\d{2}:\d{2}):/);
  return match ? match[1] : "";
}

export function PrayerTimesPanel({ prayerTimes, language, highlightedPrayer }: PrayerTimesPanelProps) {
  const { t } = useTranslation(language);
  const today = prayerTimes.today;
  const sourceLabel = prayerTimes.effectiveSource === "manual" ? "Manual" : "Aladhan";
  const updateTime = formatUpdateTime(prayerTimes.updated_at);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-[clamp(0.6rem,0.95vw,1.15rem)] py-[clamp(0.55rem,0.85vw,0.95rem)] shadow-[0_14px_40px_rgba(21,54,35,0.13)]">
      <p className="text-center text-[clamp(0.96rem,1.7vw,1.78rem)] font-black uppercase tracking-[0.04em] text-emerald-800">
        {t("prayer_times")}
      </p>
      <div className="mx-auto mt-[clamp(0.22rem,0.38vw,0.45rem)] h-px w-[90%] bg-slate-200" />

      <div className="mt-[clamp(0.18rem,0.28vw,0.34rem)] grid min-h-0 flex-1 grid-rows-6 gap-[clamp(0.14rem,0.22vw,0.28rem)]">
        {prayerLabels.map(([key, labelKey], index) => {
          const isActive = key === highlightedPrayer;

          return (
            <div
              className={`grid h-full min-h-0 grid-cols-[clamp(1.45rem,2vw,2.35rem)_minmax(0,1fr)_auto] items-center gap-[clamp(0.28rem,0.45vw,0.62rem)] rounded-[clamp(0.65rem,0.9vw,1rem)] px-[clamp(0.38rem,0.62vw,0.72rem)] py-[clamp(0.08rem,0.12vw,0.16rem)] ${
                isActive
                  ? "bg-emerald-800 text-white shadow-[0_12px_26px_rgba(12,94,48,0.28)]"
                  : "border-b border-slate-200/80 text-slate-900"
              }`}
              key={key}
            >
              <div
                className={`text-center text-[clamp(1.02rem,1.8vw,1.72rem)] leading-none ${
                  isActive ? "text-white" : index === 0 || index === 5 ? "text-sky-700" : "text-amber-400"
                }`}
              >
                {prayerIcons[index]}
              </div>
              <p className="truncate text-[clamp(0.84rem,1.42vw,1.42rem)] font-black uppercase tracking-normal leading-none">
                {t(labelKey)}
              </p>
              <p className="font-mono text-[clamp(0.98rem,1.68vw,1.6rem)] font-black leading-none tracking-normal">
                {today[key]}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-[clamp(0.1rem,0.18vw,0.26rem)] truncate text-center text-[clamp(0.42rem,0.58vw,0.6rem)] font-medium tracking-wide text-slate-400">
        {sourceLabel}
        {updateTime ? ` · ${updateTime}` : ""}
      </p>
    </section>
  );
}
