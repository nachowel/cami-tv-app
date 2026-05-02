import { useTranslation } from "../../i18n/useTranslation";
import type { DisplaySettings } from "../../types/display";

interface MosqueHeaderPanelProps {
  settings: DisplaySettings;
}

export function MosqueHeaderPanel({ settings }: MosqueHeaderPanelProps) {
  const { t } = useTranslation(settings.language);
  const [primaryName, secondaryName = "Bexley"] = settings.mosque_name.split(" ");

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-[0_14px_38px_rgba(21,54,35,0.12)]">
      <div className="relative z-10 flex flex-1 flex-col items-center px-5 pt-7 text-center 2xl:px-7 2xl:pt-9">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[2.3rem] border-4 border-emerald-700/30 2xl:h-36 2xl:w-36 2xl:rounded-[3rem]">
          <div className="absolute -top-4 h-8 w-8 rotate-45 rounded-tl-2xl border-l-4 border-t-4 border-emerald-700/60 bg-white" />
          <div className="text-4xl font-black leading-none text-emerald-900 2xl:text-5xl">
            {primaryName}
          </div>
        </div>
        <h1 className="mt-4 text-4xl font-black leading-none text-emerald-900 2xl:mt-5 2xl:text-6xl">
          {secondaryName.toUpperCase()}
        </h1>
        <div className="mt-4 h-px w-28 bg-emerald-800/20 2xl:mt-5" />
        <p className="mt-4 text-sm font-bold uppercase leading-relaxed tracking-[0.07em] text-emerald-900/80 2xl:text-base">
          {t("islamic_community")}
          <span className="block">{t("millennium_centre")}</span>
        </p>
      </div>

      <div className="relative h-[34%] overflow-hidden bg-gradient-to-t from-emerald-50/55 to-emerald-50/5">
        <div className="absolute bottom-0 left-1/2 h-24 w-40 -translate-x-1/2 rounded-t-full border-[3px] border-emerald-800/14 bg-white/20 2xl:h-32 2xl:w-52" />
        <div className="absolute bottom-0 left-[54%] h-34 w-4 rounded-t-full bg-emerald-800/10 2xl:h-44" />
        <div className="absolute bottom-14 left-[54%] h-7 w-7 -translate-x-[0.3rem] rotate-45 bg-emerald-800/10 2xl:bottom-20" />
        <div className="absolute bottom-0 left-0 h-14 w-full bg-gradient-to-t from-emerald-900/8 to-transparent" />
      </div>

      <div className="m-4 rounded-xl bg-emerald-800 px-5 py-4 text-white shadow-[0_12px_30px_rgba(12,94,48,0.28)] 2xl:m-5 2xl:px-6 2xl:py-5">
        <p className="text-lg font-black uppercase tracking-[0.05em] 2xl:text-xl">
          {t("support_our_mosque")}
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50 2xl:text-base">
          {t("donation_support_message")}
        </p>
      </div>
    </section>
  );
}
