import { useTranslation } from "../../i18n/useTranslation";
import type { DailyContentCurrent, DisplayLanguage } from "../../types/display";
import { AutoScrollingText } from "./AutoScrollingText";
import {
  resolveDailyContentDisplaySource,
  resolveDailyContentDisplayText,
} from "./dailyContentView.ts";

interface DailyContentPanelProps {
  content: DailyContentCurrent;
  language: DisplayLanguage;
}

export function DailyContentPanel({ content, language }: DailyContentPanelProps) {
  const { t } = useTranslation(language);
  const translatedText = resolveDailyContentDisplayText({
    content,
    fallbackText: t("daily_ayah_translation"),
    language,
  });
  const source = resolveDailyContentDisplaySource({
    content,
    fallbackSource: t("daily_ayah_source"),
    language,
  });

  return (
    <section className="grid h-full min-h-0 min-w-0 grid-cols-[13%_minmax(0,1fr)] items-center gap-[clamp(0.38rem,0.6vw,0.72rem)] overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-[clamp(0.65rem,0.95vw,1.2rem)] py-[clamp(0.28rem,0.38vw,0.46rem)] text-center shadow-[0_12px_35px_rgba(21,54,35,0.10)] 2xl:grid-cols-[15%_minmax(0,1fr)]">
      <div className="flex items-center justify-center">
        <div className="relative h-[clamp(3.1rem,4.8vw,5.3rem)] w-[clamp(4.4rem,6.8vw,7rem)]">
          <div className="absolute bottom-2 left-3 h-[clamp(2rem,3vw,3.2rem)] w-[clamp(2.8rem,4.5vw,4.7rem)] -rotate-12 rounded-md border-[3px] border-amber-700/55 bg-amber-50 shadow-md" />
          <div className="absolute bottom-2 right-3 h-[clamp(2rem,3vw,3.2rem)] w-[clamp(2.8rem,4.5vw,4.7rem)] rotate-12 rounded-md border-[3px] border-amber-700/55 bg-amber-50 shadow-md" />
          <div className="absolute bottom-0 left-1/2 h-[clamp(2.2rem,3.3vw,3.2rem)] w-[0.48rem] -translate-x-1/2 rotate-45 rounded-full bg-amber-800/70" />
          <div className="absolute right-2 top-1 h-[clamp(2rem,3vw,3.2rem)] w-[clamp(0.78rem,1vw,1.25rem)] rounded-full border-l-[3px] border-emerald-600/60" />
        </div>
      </div>
      <div className="grid min-h-0 min-w-0 content-start grid-rows-[auto_auto_minmax(0,1fr)_auto]">
        <p className="justify-self-center self-start text-[clamp(0.88rem,1.28vw,1.26rem)] font-black uppercase tracking-[0.06em] text-emerald-800">
          {t("daily_ayah")}
        </p>
        <p
          className="tv-arabic-copy mt-[clamp(0.04rem,0.14vw,0.18rem)] max-w-full break-words text-[clamp(0.9rem,1.12vw,1.12rem)] font-bold text-slate-900"
          dir="rtl"
          lang="ar"
        >
          {content.arabic}
        </p>
        <AutoScrollingText
          className="mx-auto mt-[clamp(0.08rem,0.14vw,0.2rem)] max-w-4xl self-start overflow-hidden text-[clamp(0.7rem,0.88vw,0.88rem)] font-medium leading-[1.18] text-slate-700"
        >
          {`"${translatedText}"`}
        </AutoScrollingText>
        <p className="mx-auto mt-[clamp(0.03rem,0.12vw,0.16rem)] max-w-full truncate text-[clamp(0.56rem,0.68vw,0.7rem)] font-semibold leading-none text-slate-500">
          {source}
        </p>
      </div>
    </section>
  );
}
