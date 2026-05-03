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
import { resolveTickerDisplayText } from "./tickerView";
import { createTvWeatherController } from "./tvWeatherState";

interface TvDisplayLayoutProps {
  data: DisplayData;
}

export function TvDisplayLayout({ data }: TvDisplayLayoutProps) {
  const language = data.settings.language;
  const { t } = useTranslation(language);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<TvWeather>(() => createUnavailableTvWeather());
  const prayerMoment = getCurrentAndNextPrayer(now, data.prayerTimes);

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
    <main className="min-h-screen overflow-hidden bg-[#f5f3ea] p-3 text-[#14201d] 2xl:p-4">
      <div className="mx-auto grid h-[calc(100vh-1.5rem)] max-w-[1920px] grid-cols-[18%_minmax(0,1fr)_31%] grid-rows-[minmax(0,1fr)_27%_6%] gap-3 overflow-hidden rounded-[1.35rem] border border-emerald-900/10 bg-[#fffdf7] p-3 shadow-[0_18px_55px_rgba(21,54,35,0.14)] 2xl:h-[calc(100vh-2rem)] 2xl:grid-cols-[18%_minmax(0,1fr)_29%] 2xl:grid-rows-[minmax(0,1fr)_23%_6.5%] 2xl:gap-5 2xl:p-5">
        <aside className="min-h-0">
          <MosqueHeaderPanel settings={data.settings} />
        </aside>

        <section className="grid min-h-0 min-w-0 grid-rows-[72%_minmax(0,1fr)] gap-3 2xl:grid-rows-[72%_minmax(0,1fr)] 2xl:gap-5">
          <ClockPanel
            language={language}
            now={now}
            nextPrayerName={prayerMoment.nextPrayer.name}
            countdownMs={prayerMoment.countdownMs}
            weather={weather}
          />
          <DailyContentPanel content={data.dailyContent} language={language} />
        </section>

        <aside className="min-h-0">
          <PrayerTimesPanel
            prayerTimes={data.prayerTimes}
            language={language}
            highlightedPrayer={prayerMoment.nextPrayer.name}
          />
        </aside>

        <section className="col-span-3 grid min-h-0 grid-cols-[26%_1fr_30%] gap-3 2xl:grid-cols-[24%_1fr_32%] 2xl:gap-5">
          <AnnouncementBar announcements={data.announcements} language={language} />
          <DonationPanel donation={data.donation} language={language} />
          <section className="relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-5 py-4 shadow-[0_12px_35px_rgba(21,54,35,0.10)] 2xl:px-9 2xl:py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-700/20 bg-emerald-50 text-xl text-emerald-800 2xl:h-11 2xl:w-11 2xl:text-2xl">
                ♡
              </div>
              <div className="relative z-10">
                <p className="text-lg font-bold uppercase tracking-[0.08em] text-emerald-800 2xl:text-2xl">
                  {t("support_our_mosque")}
                </p>
                <p className="mt-3 max-w-md text-base font-medium leading-snug text-slate-700 2xl:mt-4 2xl:text-2xl">
                  {t("donation_support_message")}
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 right-3 h-28 w-44 opacity-20 2xl:h-36 2xl:w-56">
              <div className="absolute bottom-0 left-8 h-20 w-28 rounded-t-full border-4 border-emerald-800/45" />
              <div className="absolute bottom-0 left-16 h-28 w-4 bg-emerald-800/35" />
              <div className="absolute bottom-0 right-4 h-24 w-4 bg-emerald-800/35" />
            </div>
          </section>
        </section>

        <footer className="col-span-3 flex min-h-0 items-center gap-4 overflow-hidden rounded-2xl bg-emerald-900 px-5 text-white shadow-[0_12px_34px_rgba(10,73,38,0.24)] 2xl:gap-8 2xl:px-10">
          <div className="min-w-0 flex-1 overflow-hidden">
            <AutoScrollingText className="w-full max-w-full text-base font-semibold 2xl:text-2xl">
              {resolveTickerDisplayText({
                ticker: data.ticker,
                language,
                fallbackText: t("cleanliness_hadith"),
              })}
            </AutoScrollingText>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-base font-semibold 2xl:gap-7 2xl:text-2xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 2xl:h-10 2xl:w-10">f</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 2xl:h-10 2xl:w-10">ig</span>
            <span className="h-7 w-px bg-white/35 2xl:h-9" />
            <span>icmgbexley</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
