import type { TranslationKey } from "../../i18n/translations";
import type { DisplayLanguage, TvWeather } from "../../types/display";
import { useTranslation } from "../../i18n/useTranslation";
import { formatCountdown, type PrayerName } from "../../utils/prayerTimes";

interface ClockPanelProps {
  language: DisplayLanguage;
  now: Date;
  nextPrayerName: PrayerName;
  countdownMs: number;
  weather: TvWeather;
  weatherColumnWidth: number;
}

const prayerLabelKeys: Record<PrayerName, TranslationKey> = {
  fajr: "prayer_fajr",
  dhuhr: "prayer_dhuhr",
  asr: "prayer_asr",
  maghrib: "prayer_maghrib",
  isha: "prayer_isha",
};

/**
 * Format the clock display using Europe/London timezone consistently.
 * This ensures the TV always shows London time regardless of which machine
 * is running the browser.
 */
function formatClockTime(now: Date, language: DisplayLanguage) {
  return now.toLocaleTimeString(language === "tr" ? "tr-TR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  });
}

function formatClockDate(now: Date, language: DisplayLanguage) {
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const londonDay = now.toLocaleDateString(locale, {
    weekday: "long",
    timeZone: "Europe/London",
  });
  const londonDateStr = now.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  return `${londonDay}, ${londonDateStr}`;
}

function localizeCountdown(countdownText: string, _language: DisplayLanguage) {
  return countdownText;
}

function getCountdownLabel(language: DisplayLanguage, prayerName: string) {
  if (language === "tr") {
    return `${prayerName} namazına kalan süre`;
  }

  return `Time until ${prayerName}`;
}

function getWeatherGlyph(icon: string) {
  if (icon === "clear-day") return "☀";
  if (icon === "clear-night") return "☾";
  if (icon === "partly-cloudy-day" || icon === "partly-cloudy-night") return "⛅";
  if (icon === "cloudy") return "☁";
  if (icon === "fog") return "〰";
  if (icon === "drizzle" || icon === "rain") return "☂";
  if (icon === "snow") return "❄";
  if (icon === "thunderstorm") return "⚡";
  return "○";
}

export function ClockPanel({
  language,
  now,
  nextPrayerName,
  countdownMs,
  weather,
  weatherColumnWidth,
}: ClockPanelProps) {
  const { t } = useTranslation(language);
  const nextPrayerLabel = t(prayerLabelKeys[nextPrayerName]);
  const countdownText = localizeCountdown(formatCountdown(countdownMs), language);
  const countdownLabel = getCountdownLabel(language, nextPrayerLabel);
  const dateStr = formatClockDate(now, language);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col items-center justify-start overflow-hidden rounded-2xl bg-[#fffdf7] px-[clamp(0.4rem,0.65vw,0.72rem)] pb-[clamp(0.25rem,0.4vw,0.45rem)] pt-[clamp(0.16rem,0.32vw,0.32rem)] text-center">
      <div>
        <p className="text-[clamp(0.9rem,1.58vw,1.82rem)] font-black uppercase tracking-[0.08em] text-emerald-800">
          {dateStr}
        </p>
        <p className="mt-[0.04rem] text-[clamp(0.66rem,0.96vw,1.08rem)] font-medium text-slate-600">
          {t("hijri")}
        </p>
      </div>

      <div
        className="mt-[clamp(0.08rem,0.25vh,0.22rem)] grid w-full min-w-0 items-center gap-[clamp(1rem,1.6vw,2rem)]"
        style={{ gridTemplateColumns: `minmax(0,1fr) ${weatherColumnWidth}px` }}
      >
        <p className="min-w-0 text-center font-mono text-[clamp(3.3rem,6.1vw,7rem)] font-[950] leading-[0.86] tracking-[-0.02em] text-emerald-950 drop-shadow-[0_5px_8px_rgba(13,77,43,0.16)]">
          {formatClockTime(now, language)}
        </p>
        <div className="weather-stack flex min-w-0 max-w-full translate-y-[clamp(0.28rem,0.55vh,0.58rem)] flex-col items-center justify-center gap-[clamp(0.22rem,0.34vw,0.42rem)] pl-[clamp(0.1rem,0.25vw,0.3rem)] text-slate-700 opacity-80">
          <div className="relative h-[clamp(2.3rem,3.9vw,4.05rem)] w-[clamp(2.3rem,3.9vw,4.05rem)] rounded-full border-[clamp(0.22rem,0.36vw,0.48rem)] border-amber-400/80">
            <span className="absolute inset-0 flex items-center justify-center text-[clamp(0.9rem,1.5vw,1.58rem)] font-black text-amber-500/85">
              {getWeatherGlyph(weather.icon)}
            </span>
            <span className="absolute left-1/2 top-[clamp(-0.7rem,-0.88vw,-0.92rem)] h-[clamp(0.36rem,0.5vw,0.58rem)] w-[clamp(0.14rem,0.18vw,0.22rem)] -translate-x-1/2 rounded-full bg-amber-400/80" />
            <span className="absolute bottom-[clamp(-0.7rem,-0.88vw,-0.92rem)] left-1/2 h-[clamp(0.36rem,0.5vw,0.58rem)] w-[clamp(0.14rem,0.18vw,0.22rem)] -translate-x-1/2 rounded-full bg-amber-400/80" />
            <span className="absolute left-[clamp(-0.7rem,-0.88vw,-0.92rem)] top-1/2 h-[clamp(0.14rem,0.18vw,0.22rem)] w-[clamp(0.36rem,0.5vw,0.58rem)] -translate-y-1/2 rounded-full bg-amber-400/80" />
            <span className="absolute right-[clamp(-0.7rem,-0.88vw,-0.92rem)] top-1/2 h-[clamp(0.14rem,0.18vw,0.22rem)] w-[clamp(0.36rem,0.5vw,0.58rem)] -translate-y-1/2 rounded-full bg-amber-400/80" />
          </div>
          <p className="text-center text-[clamp(0.94rem,1.4vw,1.52rem)] font-semibold leading-none">
            {weather.temperatureC == null ? "--°C" : `${weather.temperatureC}°C`}
          </p>
          <p className="max-w-full break-words text-center text-[clamp(0.54rem,0.7vw,0.74rem)] font-medium leading-tight">
            {t(weather.condition)}
          </p>
        </div>
      </div>

      <div className="mt-auto grid w-full max-w-[89%] shrink-0 grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-start rounded-2xl border border-emerald-900/10 bg-white px-[clamp(0.52rem,0.8vw,0.95rem)] py-[clamp(0.3rem,0.45vw,0.42rem)] text-left shadow-[0_12px_35px_rgba(21,54,35,0.10)]">
        <div className="grid grid-cols-[clamp(1.75rem,2.35vw,2.75rem)_1fr] items-start gap-[clamp(0.35rem,0.55vw,0.72rem)]">
          <div className="flex h-[clamp(1.75rem,2.35vw,2.75rem)] w-[clamp(1.75rem,2.35vw,2.75rem)] items-center justify-center rounded-full border-[3px] border-emerald-700 text-[clamp(0.88rem,1.35vw,1.45rem)] font-black text-emerald-800">
            ⌚
          </div>
          <div className="min-w-0">
            <p className="text-[clamp(0.58rem,0.74vw,0.76rem)] font-black leading-snug text-slate-800">
              {countdownLabel}
            </p>
            <p className="mt-[0.04rem] whitespace-nowrap text-[clamp(0.9rem,1.34vw,1.22rem)] font-black leading-tight text-emerald-800">
              {countdownText}
            </p>
          </div>
        </div>
        <div className="h-full self-stretch bg-slate-200" />
        <div className="grid grid-cols-[clamp(1.75rem,2.35vw,2.75rem)_1fr] items-start gap-[clamp(0.35rem,0.55vw,0.72rem)] pl-[clamp(0.55rem,0.8vw,0.95rem)]">
          <div className="flex h-[clamp(1.75rem,2.35vw,2.75rem)] w-[clamp(1.75rem,2.35vw,2.75rem)] items-center justify-center rounded-xl border-[3px] border-emerald-700 text-[clamp(0.88rem,1.35vw,1.45rem)] font-black text-emerald-800">
            □
          </div>
          <div className="min-w-0">
            <p className="text-[clamp(0.58rem,0.74vw,0.76rem)] font-black leading-snug text-slate-800">
              {t("next_prayer")}
            </p>
            <p className="mt-[0.04rem] text-[clamp(0.94rem,1.36vw,1.3rem)] font-black leading-tight text-emerald-800">
              {nextPrayerLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
