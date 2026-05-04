import { useEffect, useState } from "react";
import type { DisplayData, TvWeather } from "../../types/display";
import { useTranslation } from "../../i18n/useTranslation";
import { createUnavailableTvWeather } from "../../services/weatherService";
import { getCurrentAndNextPrayer } from "../../utils/prayerTimes";
import { AnnouncementBar } from "./AnnouncementBar";
import { AutoScrollingText } from "./AutoScrollingText";
import { ClockPanel } from "./ClockPanel";
import { DailyContentPanel } from "./DailyContentPanel";
import { DonationPanel } from "./DonationPanel";
import { MosqueHeaderPanel } from "./MosqueHeaderPanel";
import { PrayerTimesPanel } from "./PrayerTimesPanel";
import { resolvePrayerPanelState } from "./prayerMomentView";
import { resolveTickerDisplayText } from "./tickerView";
import { createTvWeatherController } from "./tvWeatherState";
import { useTvViewportLayout } from "./tvViewportLayout";

interface TvDisplayLayoutProps {
  data: DisplayData;
}

export function TvDisplayLayout({ data }: TvDisplayLayoutProps) {
  const language = data.settings.language;
  const { t } = useTranslation(language);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<TvWeather>(() => createUnavailableTvWeather());
  const viewportLayout = useTvViewportLayout();
  const prayerMoment = getCurrentAndNextPrayer(now, data.prayerTimes);
  const prayerPanelState = resolvePrayerPanelState(prayerMoment);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const controller = createTvWeatherController({
      onWeather: setWeather,
    });

    controller.start();

    return () => {
      controller.stop();
    };
  }, []);

  return (
    <main
      className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#f5f3ea] text-[#14201d]"
      style={{ height: "100dvh" }}
    >
      <div
        className="grid aspect-[16/9] max-w-[1920px] grid-cols-[18%_minmax(0,1fr)_31%] overflow-hidden rounded-[1.35rem] border border-emerald-900/10 bg-[#fffdf7] shadow-[0_18px_55px_rgba(21,54,35,0.14)] 2xl:grid-cols-[18%_minmax(0,1fr)_29%]"
        style={{
          gap: `${viewportLayout.gap}px`,
          gridTemplateRows: `minmax(0,1fr) ${viewportLayout.middleRowHeight}px ${viewportLayout.footerHeight}px`,
          height: `${viewportLayout.stageHeight}px`,
          padding: `${viewportLayout.safePaddingY}px ${viewportLayout.safePaddingX}px`,
          width: `${viewportLayout.stageWidth}px`,
        }}
      >
        <aside className="min-h-0">
          <MosqueHeaderPanel settings={data.settings} />
        </aside>

        <section className="grid min-h-0 min-w-0 grid-rows-[62%_minmax(0,1fr)]" style={{ gap: `${viewportLayout.gap}px` }}>
          <ClockPanel
            language={language}
            now={now}
            nextPrayerName={prayerPanelState.nextPrayerName}
            countdownMs={prayerMoment.countdownMs}
            weather={weather}
            weatherColumnWidth={viewportLayout.weatherColumnWidth}
          />
          <DailyContentPanel content={data.dailyContent} language={language} />
        </section>

        <aside className="min-h-0">
          <PrayerTimesPanel
            prayerTimes={data.prayerTimes}
            language={language}
            highlightedPrayer={prayerPanelState.highlightedPrayer}
          />
        </aside>

        <section className="col-span-3 grid min-h-0 grid-cols-[26%_1fr_30%] 2xl:grid-cols-[24%_1fr_32%]" style={{ gap: `${viewportLayout.gap}px` }}>
          <AnnouncementBar announcements={data.announcements} language={language} />
          <DonationPanel donation={data.donation} language={language} />
          <section className="relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-[clamp(0.85rem,1.2vw,1.6rem)] py-[clamp(0.75rem,0.95vw,1.2rem)] shadow-[0_12px_35px_rgba(21,54,35,0.10)]">
            <div className="flex items-start gap-[clamp(0.75rem,1vw,1.25rem)]">
              <div className="flex h-[clamp(2rem,2.9vw,2.75rem)] w-[clamp(2rem,2.9vw,2.75rem)] shrink-0 items-center justify-center rounded-full border border-emerald-700/20 bg-emerald-50 text-[clamp(1rem,1.55vw,1.4rem)] text-emerald-800">
                ♡
              </div>
              <div className="relative z-10">
                <p className="text-[clamp(0.95rem,1.5vw,1.45rem)] font-bold uppercase tracking-[0.08em] text-emerald-800">
                  {t("support_our_mosque")}
                </p>
                <p className="mt-[clamp(0.35rem,0.55vw,0.75rem)] max-w-md text-[clamp(0.82rem,1.05vw,1.12rem)] font-medium leading-snug text-slate-700">
                  {t("donation_support_message")}
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 right-3 h-[clamp(4.8rem,7vw,7.8rem)] w-[clamp(7.8rem,11vw,12.5rem)] opacity-20">
              <div className="absolute bottom-0 left-8 h-20 w-28 rounded-t-full border-4 border-emerald-800/45" />
              <div className="absolute bottom-0 left-16 h-28 w-4 bg-emerald-800/35" />
              <div className="absolute bottom-0 right-4 h-24 w-4 bg-emerald-800/35" />
            </div>
          </section>
        </section>

        <footer className="col-span-3 flex min-h-0 items-center gap-[clamp(0.55rem,0.72vw,1rem)] overflow-hidden rounded-2xl bg-emerald-900 px-[clamp(0.75rem,1vw,1.5rem)] text-white shadow-[0_12px_34px_rgba(10,73,38,0.24)]">
          <div className="min-w-0 flex-1 overflow-hidden">
            <AutoScrollingText className="w-full max-w-full text-[clamp(0.76rem,1vw,1.12rem)] font-semibold">
              {resolveTickerDisplayText({
                ticker: data.ticker,
                language,
                fallbackText: t("cleanliness_hadith"),
              })}
            </AutoScrollingText>
          </div>
          <div className="flex shrink-0 items-center gap-[clamp(0.35rem,0.48vw,0.7rem)] text-[clamp(0.72rem,0.92vw,1rem)] font-semibold">
            <span className="flex h-[clamp(1.35rem,1.7vw,1.9rem)] w-[clamp(1.35rem,1.7vw,1.9rem)] items-center justify-center rounded-full border border-white/35">f</span>
            <span className="flex h-[clamp(1.35rem,1.7vw,1.9rem)] w-[clamp(1.35rem,1.7vw,1.9rem)] items-center justify-center rounded-full border border-white/35">ig</span>
            <span className="h-[clamp(1.1rem,1.4vw,1.6rem)] w-px bg-white/35" />
            <span>icmgbexley</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
