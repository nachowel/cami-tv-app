import type { DisplayLanguage, HijriDateOffset } from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import { AdminSectionCard } from "./AdminSectionCard";

interface LanguageSettingsSectionProps {
  id?: string;
  language: DisplayLanguage;
  hijriDateOffset: HijriDateOffset;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  status: SectionStatus | null;
  onChange: (language: DisplayLanguage) => void;
  onHijriDateOffsetChange: (offset: HijriDateOffset) => void;
}

const languageOptions: Array<{ label: string; value: DisplayLanguage }> = [
  { label: "English", value: "en" },
  { label: "Türkçe", value: "tr" },
];

const hijriDateOffsetOptions: Array<{ label: string; value: HijriDateOffset }> = [
  { label: "-1 gün", value: -1 },
  { label: "Standart", value: 0 },
  { label: "+1 gün", value: 1 },
];

export function LanguageSettingsSection({
  id,
  language,
  hijriDateOffset,
  mobileOpen,
  onMobileToggle,
  status,
  onChange,
  onHijriDateOffsetChange,
}: LanguageSettingsSectionProps) {
  return (
    <AdminSectionCard
      id={id}
      mobileOpen={mobileOpen}
      onMobileToggle={onMobileToggle}
      title="Dil Ayarı"
      description="Ekranda kullanılacak dili seçin."
    >
      <div className="flex flex-wrap gap-3">
        {languageOptions.map((option) => (
          <button
            className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              language === option.value
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Geçerli değer: <span className="font-semibold text-slate-900">{language}</span>
      </p>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-900">Hicri tarih düzeltmesi</p>
        <p className="mt-1 text-sm text-slate-600">
          Yerel hilal gözlemine göre Hicri günü bir gün geri veya ileri alın.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {hijriDateOffsetOptions.map((option) => (
            <button
              className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                hijriDateOffset === option.value
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500"
              }`}
              key={option.value}
              onClick={() => onHijriDateOffsetChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
