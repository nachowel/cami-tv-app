import type { ThemeMode } from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import { AdminSectionCard } from "./AdminSectionCard";

interface ThemeModeSectionProps {
  id?: string;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  themeMode: ThemeMode;
  status: SectionStatus | null;
  onChange: (themeMode: ThemeMode) => void;
}

const themeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: "Otomatik", value: "auto" },
  { label: "Açık", value: "light" },
  { label: "Koyu", value: "dark" },
];

export function ThemeModeSection({
  id,
  mobileOpen,
  onMobileToggle,
  themeMode,
  status,
  onChange,
}: ThemeModeSectionProps) {
  return (
    <AdminSectionCard
      id={id}
      mobileOpen={mobileOpen}
      onMobileToggle={onMobileToggle}
      title="Ekran Ayarları"
      description="Ekran tema modunu seçin."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {themeOptions.map((option) => (
          <button
            className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition ${
              themeMode === option.value
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
        Geçerli değer: <span className="font-semibold text-slate-900">{themeMode}</span>
      </p>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
