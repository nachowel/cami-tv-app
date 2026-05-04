import type { DisplayLanguage } from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import { AdminSectionCard } from "./AdminSectionCard";

interface LanguageSettingsSectionProps {
  id?: string;
  language: DisplayLanguage;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  status: SectionStatus | null;
  onChange: (language: DisplayLanguage) => void;
}

const languageOptions: Array<{ label: string; value: DisplayLanguage }> = [
  { label: "English", value: "en" },
  { label: "Türkçe", value: "tr" },
];

export function LanguageSettingsSection({
  id,
  language,
  mobileOpen,
  onMobileToggle,
  status,
  onChange,
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

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
