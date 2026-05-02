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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-5 py-5 shadow-[0_14px_40px_rgba(21,54,35,0.13)] 2xl:px-8 2xl:py-8">
      <p className="text-center text-2xl font-black uppercase tracking-[0.04em] text-emerald-800 2xl:text-4xl">
        {t("prayer_times")}
      </p>
      <div className="mx-auto mt-4 h-px w-[88%] bg-slate-200 2xl:mt-5" />

      <div className="mt-3 flex flex-1 flex-col justify-between 2xl:mt-5">
        {prayerLabels.map(([key, labelKey], index) => {
          const isActive = key === highlightedPrayer;

          return (
            <div
              className={`grid min-h-[3.45rem] grid-cols-[2.8rem_1fr_auto] items-center gap-3 rounded-xl px-3 py-1 2xl:min-h-[5.25rem] 2xl:grid-cols-[4.6rem_1fr_auto] 2xl:gap-5 2xl:px-5 ${
                isActive
                  ? "bg-emerald-800 text-white shadow-[0_12px_26px_rgba(12,94,48,0.28)]"
                  : "border-b border-slate-200/80 text-slate-900"
              }`}
              key={key}
            >
              <div
                className={`text-center text-3xl leading-none 2xl:text-5xl ${
                  isActive ? "text-white" : index === 0 || index === 5 ? "text-sky-700" : "text-amber-400"
                }`}
              >
                {prayerIcons[index]}
              </div>
              <p className="text-xl font-black uppercase tracking-normal 2xl:text-4xl">
                {t(labelKey)}
              </p>
              <p className="font-mono text-2xl font-black tracking-normal 2xl:text-5xl">
                {today[key]}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 truncate text-center text-[0.65rem] font-medium tracking-wide text-slate-400 2xl:mt-4 2xl:text-xs">
        {sourceLabel}
        {updateTime ? ` · ${updateTime}` : ""}
      </p>
    </section>
  );
}
