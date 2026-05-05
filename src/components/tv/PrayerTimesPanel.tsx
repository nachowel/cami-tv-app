import { useTranslation } from "../../i18n/useTranslation";
import type { DisplayLanguage, PrayerTimesCurrent, PrayerTimesForDay } from "../../types/display";
import type { TranslationKey } from "../../i18n/translations";
import type { PrayerName } from "../../utils/prayerTimes";

interface PrayerTimesPanelProps {
  prayerTimes: PrayerTimesCurrent;
  language: DisplayLanguage;
  highlightedPrayer: PrayerName;
  lastSuccessfulPrayerTimes?: PrayerTimesCurrent | null;
  status?: "loading" | "ok" | "error";
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

function getLondonTodayIsoDate(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

export function PrayerTimesPanel({ prayerTimes, language, highlightedPrayer, lastSuccessfulPrayerTimes, status }: PrayerTimesPanelProps) {
  const { t } = useTranslation(language);

  const hasLastKnown = status === "error" && lastSuccessfulPrayerTimes != null;
  const isStale = hasLastKnown && lastSuccessfulPrayerTimes.date !== getLondonTodayIsoDate();
  const isUnavailable = status === "error" && lastSuccessfulPrayerTimes == null;

  if (isUnavailable) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-[clamp(0.6rem,0.95vw,1.15rem)] py-[clamp(0.55rem,0.85vw,0.95rem)] shadow-[0_14px_40px_rgba(21,54,35,0.13)]">
        <p className="text-center text-[clamp(0.96rem,1.7vw,1.78rem)] font-black uppercase tracking-[0.04em] text-emerald-800">
          {t("prayer_times")}
        </p>
        <div className="mx-auto mt-[clamp(0.22rem,0.38vw,0.45rem)] h-px w-[90%] bg-slate-200" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="text-[clamp(1.5rem,2.5vw,2.5rem)] text-slate-300">☾</div>
          <p className="text-center text-[clamp(0.8rem,1.2vw,1.2rem)] font-medium leading-snug text-slate-500">
            Prayer times temporarily unavailable
          </p>
        </div>
      </section>
    );
  }

  if (isStale) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-[clamp(0.6rem,0.95vw,1.15rem)] py-[clamp(0.55rem,0.85vw,0.95rem)] shadow-[0_14px_40px_rgba(21,54,35,0.13)]">
        <p className="text-center text-[clamp(0.96rem,1.7vw,1.78rem)] font-black uppercase tracking-[0.04em] text-emerald-800">
          {t("prayer_times")}
        </p>
        <div className="mx-auto mt-[clamp(0.22rem,0.38vw,0.45rem)] h-px w-[90%] bg-slate-200" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="text-[clamp(1.5rem,2.5vw,2.5rem)] text-slate-300">☾</div>
          <p className="text-center text-[clamp(0.8rem,1.2vw,1.2rem)] font-medium leading-snug text-slate-500">
            Prayer times need updating
          </p>
          <p className="text-center text-[clamp(0.7rem,1vw,1rem)] font-medium leading-snug text-slate-400">
            Please check the admin sync.
          </p>
        </div>
      </section>
    );
  }

  const activePrayerTimes = hasLastKnown ? lastSuccessfulPrayerTimes : prayerTimes;
  const today = activePrayerTimes.today;
  const provider = activePrayerTimes.provider;

  console.log("UI SOURCE DEBUG", {
    provider: prayerTimes.provider,
    effectiveSource: prayerTimes.effectiveSource
  });

  let label = "";
  let activeSource = "";

  if (provider === "awqat") {
    label = "Otomatik: Awqat";
    activeSource = "awqat";
  } else if (provider === "aladhan") {
    label = "Otomatik: Aladhan";
    activeSource = "aladhan";
  } else {
    label = "Otomatik bekleniyor";
    activeSource = "manual";
  }

  const sourceLabel = activeSource === "manual" ? "Geçerli mod: Manual" : `Geçerli mod: ${label}`;
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
      {hasLastKnown ? (
        <p className="mt-[clamp(0.1rem,0.18vw,0.26rem)] truncate text-center text-[clamp(0.42rem,0.58vw,0.6rem)] font-medium tracking-wide text-amber-600">
          Prayer times may be temporarily outdated
        </p>
      ) : (
        <p className="mt-[clamp(0.1rem,0.18vw,0.26rem)] truncate text-center text-[clamp(0.42rem,0.58vw,0.6rem)] font-medium tracking-wide text-slate-400">
          {sourceLabel}
          {updateTime ? ` · ${updateTime}` : ""}
        </p>
      )}
    </section>
  );
}
