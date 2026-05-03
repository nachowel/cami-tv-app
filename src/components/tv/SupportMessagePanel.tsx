import { useTranslation } from "../../i18n/useTranslation";
import type { DisplayLanguage } from "../../types/display";

interface SupportMessagePanelProps {
  language: DisplayLanguage;
}

export function SupportMessagePanel({ language }: SupportMessagePanelProps) {
  const { t } = useTranslation(language);

  return (
    <section className="flex min-h-0 flex-col px-4 py-3 2xl:px-6 2xl:py-4 bg-transparent">
      <div className="flex items-center gap-2">
        <span className="text-xl 2xl:text-2xl" style={{ color: '#1a4030' }}>🕌</span>
        <p className="text-sm font-black uppercase tracking-[0.06em] 2xl:text-base" style={{ color: '#1a3d2a' }}>
          {t("support_mosque_title")}
        </p>
      </div>
      <div className="mt-2 h-px w-full" style={{ background: 'rgba(26, 61, 42, 0.1)' }} />
      <p className="mt-2 text-xs font-medium leading-relaxed 2xl:mt-3 2xl:text-sm" style={{ color: '#3a5a48' }}>
        {t("donation_card_message")}
      </p>
    </section>
  );
}
