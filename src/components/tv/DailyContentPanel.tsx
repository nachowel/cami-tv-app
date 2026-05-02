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
    <section className="grid h-full min-h-0 min-w-0 grid-cols-[20%_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white px-5 py-2.5 text-center shadow-[0_12px_35px_rgba(21,54,35,0.10)] 2xl:grid-cols-[22%_minmax(0,1fr)] 2xl:gap-7 2xl:px-10 2xl:py-4">
      <div className="flex items-center justify-center">
        <div className="relative h-20 w-28 2xl:h-32 2xl:w-44">
          <div className="absolute bottom-3 left-4 h-14 w-20 -rotate-12 rounded-md border-4 border-amber-700/55 bg-amber-50 shadow-md 2xl:h-[5rem] 2xl:w-[8rem]" />
          <div className="absolute bottom-3 right-4 h-14 w-20 rotate-12 rounded-md border-4 border-amber-700/55 bg-amber-50 shadow-md 2xl:h-[5rem] 2xl:w-[8rem]" />
          <div className="absolute bottom-0 left-1/2 h-16 w-3 -translate-x-1/2 rotate-45 rounded-full bg-amber-800/70 2xl:h-20" />
          <div className="absolute right-3 top-2 h-14 w-8 rounded-full border-l-4 border-emerald-600/60 2xl:h-20 2xl:w-10" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black uppercase tracking-[0.06em] text-emerald-800 2xl:text-3xl">
          {t("daily_ayah")}
        </p>
        <p className="mt-1.5 line-clamp-2 max-w-full break-words text-right text-[1.15rem] font-semibold leading-snug text-slate-900 2xl:mt-2.5 2xl:text-[1.35rem] 2xl:leading-snug">
          {content.arabic}
        </p>
        <AutoScrollingText
          className="mx-auto mt-1.5 max-w-4xl text-[0.95rem] font-medium leading-snug text-slate-700 2xl:mt-2.5 2xl:text-lg"
        >
          {`"${translatedText}"`}
        </AutoScrollingText>
        <p className="mx-auto mt-1 max-w-full truncate text-sm font-semibold text-slate-500 2xl:mt-1.5 2xl:text-base">
          {source}
        </p>
      </div>
    </section>
  );
}