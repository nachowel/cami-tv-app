import type { TranslationKey } from "../../i18n/translations";
import type { DisplayLanguage } from "../../types/display";
import { useTranslation } from "../../i18n/useTranslation";
import { formatCountdown, type PrayerName } from "../../utils/prayerTimes";

interface ClockPanelProps {
  language: DisplayLanguage;
  now: Date;
  nextPrayerName: PrayerName;
  countdownMs: number;
}

const prayerLabelKeys: Record<PrayerName, TranslationKey> = {
  fajr: "prayer_fajr",
  dhuhr: "prayer_dhuhr",
  asr: "prayer_asr",
  maghrib: "prayer_maghrib",
  isha: "prayer_isha",
};

function formatClockTime(now: Date, language: DisplayLanguage) {
  return now.toLocaleTimeString(language === "tr" ? "tr-TR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function localizeCountdown(countdownText: string, language: DisplayLanguage) {
  if (language === "tr") {
    return countdownText
      .replace(/ hr/g, " sa")
      .replace(/ min/g, " dk")
      .replace(/ sec/g, " sn");
  }

  return countdownText;
}

function getCountdownLabel(language: DisplayLanguage, prayerName: string) {
  if (language === "tr") {
    return `${prayerName} namazına kalan süre`;
  }

  return `Time until ${prayerName}`;
}

export function ClockPanel({ language, now, nextPrayerName, countdownMs }: ClockPanelProps) {
  const { t } = useTranslation(language);
  const nextPrayerLabel = t(prayerLabelKeys[nextPrayerName]);
  const countdownText = localizeCountdown(formatCountdown(countdownMs), language);
  const countdownLabel = getCountdownLabel(language, nextPrayerLabel);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col items-center justify-start overflow-hidden rounded-2xl bg-[#fffdf7] px-2 pb-2 pt-1 text-center 2xl:px-3 2xl:pb-3 2xl:pt-2">
      <div>
        <p className="text-xl font-black uppercase tracking-[0.08em] text-emerald-800 2xl:text-4xl">
          {t("date")}
        </p>
        <p className="mt-1 text-base font-medium text-slate-600 2xl:mt-2 2xl:text-3xl">
          {t("hijri")}
        </p>
      </div>

      <div className="mt-1 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 2xl:mt-4 2xl:gap-6">
        <p className="min-w-0 text-center font-mono text-[7.2rem] font-black leading-none text-emerald-950 drop-shadow-[0_5px_8px_rgba(13,77,43,0.16)] 2xl:text-[9.75rem]">
          {formatClockTime(now, language)}
        </p>
        <div className="flex min-w-20 flex-col items-center justify-center text-slate-700 2xl:min-w-40">
          <div className="relative h-12 w-12 rounded-full border-[0.45rem] border-amber-400 2xl:h-24 2xl:w-24 2xl:border-[0.7rem]">
            <span className="absolute left-1/2 top-[-1.25rem] h-3 w-1 -translate-x-1/2 rounded-full bg-amber-400 2xl:top-[-1.75rem] 2xl:h-5 2xl:w-1.5" />
            <span className="absolute bottom-[-1.25rem] left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-amber-400 2xl:bottom-[-1.75rem] 2xl:h-5 2xl:w-1.5" />
            <span className="absolute left-[-1.25rem] top-1/2 h-1 w-3 -translate-y-1/2 rounded-full bg-amber-400 2xl:left-[-1.75rem] 2xl:h-1.5 2xl:w-5" />
            <span className="absolute right-[-1.25rem] top-1/2 h-1 w-3 -translate-y-1/2 rounded-full bg-amber-400 2xl:right-[-1.75rem] 2xl:h-1.5 2xl:w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold leading-none 2xl:mt-4 2xl:text-4xl">10°C</p>
          <p className="mt-1 text-sm font-medium leading-tight 2xl:text-2xl">{t("partly_cloudy")}</p>
        </div>
      </div>

      <div className="mt-4 grid min-h-[6.75rem] w-[88%] grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-start rounded-2xl border border-emerald-900/10 bg-white px-5 py-4 text-left shadow-[0_12px_35px_rgba(21,54,35,0.10)] 2xl:mt-5 2xl:min-h-[8.5rem] 2xl:w-[88%] 2xl:px-8 2xl:py-5">
        <div className="grid grid-cols-[2.8rem_1fr] items-start gap-3 2xl:grid-cols-[5rem_1fr] 2xl:gap-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-emerald-700 text-2xl font-black text-emerald-800 2xl:h-16 2xl:w-16 2xl:border-4 2xl:text-4xl">
            ⌚
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black leading-snug text-slate-800 2xl:text-lg">
              {countdownLabel}
            </p>
            <p className="mt-1 text-[1.85rem] font-black leading-tight text-emerald-800 2xl:text-3xl">
              {countdownText}
            </p>
          </div>
        </div>
        <div className="h-16 self-stretch bg-slate-200 2xl:h-auto" />
        <div className="grid grid-cols-[2.8rem_1fr] items-start gap-3 pl-5 2xl:grid-cols-[5rem_1fr] 2xl:gap-7 2xl:pl-12">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-emerald-700 text-2xl font-black text-emerald-800 2xl:h-16 2xl:w-16 2xl:border-4 2xl:text-4xl">
            □
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black leading-snug text-slate-800 2xl:text-lg">
              {t("next_prayer")}
            </p>
            <p className="mt-1 text-[1.85rem] font-black leading-tight text-emerald-800 2xl:text-3xl">
              {nextPrayerLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
