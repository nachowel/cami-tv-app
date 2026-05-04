import { useTranslation } from "../../i18n/useTranslation";
import type { DisplaySettings } from "../../types/display";

interface MosqueHeaderPanelProps {
  settings: DisplaySettings;
}

export function MosqueHeaderPanel({ settings }: MosqueHeaderPanelProps) {
  const { t } = useTranslation(settings.language);
  const [primaryName, secondaryName = "Bexley"] = settings.mosque_name.split(" ");

  return (
    <section className="relative flex h-full min-h-0 flex-col justify-between rounded-2xl border border-emerald-900/10 bg-white shadow-[0_14px_38px_rgba(21,54,35,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(6rem,24%,10rem)] bg-gradient-to-t from-emerald-50/55 to-emerald-50/5">
        <div className="absolute bottom-0 left-1/2 h-[clamp(4.5rem,8vw,6rem)] w-[clamp(7.25rem,13vw,10rem)] -translate-x-1/2 rounded-t-full border-[3px] border-emerald-800/14 bg-white/20" />
        <div className="absolute bottom-0 left-[54%] h-[clamp(6.75rem,12vw,8.5rem)] w-4 rounded-t-full bg-emerald-800/10" />
        <div className="absolute bottom-[clamp(2.5rem,4.6vw,3.6rem)] left-[54%] h-[clamp(1.2rem,2vw,1.75rem)] w-[clamp(1.2rem,2vw,1.75rem)] -translate-x-[0.3rem] rotate-45 bg-emerald-800/10" />
        <div className="absolute bottom-0 left-0 h-[clamp(2.5rem,4.4vw,3.6rem)] w-full bg-gradient-to-t from-emerald-900/8 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-[clamp(0.85rem,1.2vw,1.45rem)] pt-[clamp(0.9rem,1.5vw,1.45rem)] pb-[clamp(0.6rem,0.9vw,0.95rem)] text-center">
        <div className="relative flex h-[clamp(5.5rem,8vw,9rem)] w-[clamp(5.5rem,8vw,9rem)] items-center justify-center rounded-[clamp(1.8rem,2.5vw,3rem)] border-4 border-emerald-700/30">
          <div className="absolute -top-4 h-8 w-8 rotate-45 rounded-tl-2xl border-l-4 border-t-4 border-emerald-700/60 bg-white" />
          <div className="text-[clamp(2rem,3vw,3.2rem)] font-black leading-none text-emerald-900">
            {primaryName}
          </div>
        </div>
        <h1 className="mt-[clamp(0.8rem,1.15vw,1.3rem)] text-[clamp(2rem,3.2vw,4rem)] font-black leading-none text-emerald-900">
          {secondaryName.toUpperCase()}
        </h1>
        <div className="mt-[clamp(0.8rem,1.15vw,1.3rem)] h-px w-28 bg-emerald-800/20" />
        <p className="mt-[clamp(0.7rem,1vw,1.05rem)] text-[clamp(0.66rem,0.84vw,0.9rem)] font-bold uppercase leading-[1.55] tracking-[0.065em] text-emerald-900/80">
          ISLAMIC COMMUNITY
          <span className="block">MILLI GORUS</span>
        </p>
      </div>

      <div className="relative z-10 mx-[clamp(0.55rem,0.82vw,0.95rem)] mb-[clamp(0.55rem,0.82vw,0.95rem)] flex min-h-[clamp(6.2rem,14vh,8.8rem)] flex-col justify-between rounded-xl bg-emerald-800 px-[clamp(0.72rem,0.95vw,1.05rem)] py-[clamp(0.82rem,1.05vw,1.18rem)] text-white shadow-[0_12px_30px_rgba(12,94,48,0.28)]">
        <p className="text-[clamp(0.78rem,0.98vw,0.94rem)] font-black uppercase leading-[1.18] tracking-[0.05em]">
          {t("support_our_mosque")}
        </p>
        <p className="mt-[clamp(0.5rem,0.78vw,0.88rem)] text-[clamp(0.56rem,0.7vw,0.72rem)] font-semibold leading-[1.45] text-emerald-50">
          {t("donation_support_message")}
        </p>
      </div>
    </section>
  );
}
