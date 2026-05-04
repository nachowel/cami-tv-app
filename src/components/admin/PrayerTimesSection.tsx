import type {
  PrayerTimeSourceSetting,
  PrayerTimeSourceSettings,
  PrayerTimesCurrent,
  PrayerTimesForDay,
} from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import { AdminSectionCard } from "./AdminSectionCard";
import { getPrayerTimesAdminModeState } from "./prayerTimeAdminState.ts";

interface PrayerTimesSectionProps {
  errors: Partial<Record<keyof PrayerTimesForDay, string>>;
  id?: string;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  onSourceChange: (nextSource: PrayerTimeSourceSetting) => void;
  prayerTimesCurrent: PrayerTimesCurrent;
  prayerTimeSourceSettings: PrayerTimeSourceSettings;
  prayerTimes: PrayerTimesForDay;
  status: SectionStatus | null;
  onChange: (nextPrayerTimes: PrayerTimesForDay) => void;
  onSubmit: () => void;
}

const prayerInputs: Array<{ key: keyof PrayerTimesForDay; label: string }> = [
  { key: "fajr", label: "Fajr / İmsak" },
  { key: "sunrise", label: "Sunrise / Güneş" },
  { key: "dhuhr", label: "Dhuhr / Öğle" },
  { key: "asr", label: "Asr / İkindi" },
  { key: "maghrib", label: "Maghrib / Akşam" },
  { key: "isha", label: "Isha / Yatsı" },
];

const prayerTimeSourceOptions: Array<{ label: string; value: PrayerTimeSourceSetting }> = [
  { label: "Manual Entry", value: "manual" },
  { label: "Aladhan API", value: "aladhan" },
  { label: "Awqat Salah API", value: "awqat-salah" },
];
const primaryPrayerTimeSourceOptions: Array<{ label: string; value: PrayerTimeSourceSetting }> = [
  { label: "Use Manual Entry", value: "manual" },
  { label: "Use Awqat Salah API", value: "awqat-salah" },
];

function getPrayerTimeSourceLabel(source: PrayerTimeSourceSetting) {
  return prayerTimeSourceOptions.find((option) => option.value === source)?.label ?? source;
}

function getDisplayedPrayerTimesLabel(current: PrayerTimesCurrent) {
  if (current.manualOverride || current.effectiveSource === "manual") {
    return "Manual Entry";
  }

  return getPrayerTimeSourceLabel(current.effectiveSource);
}

export function PrayerTimesSection({
  errors,
  id,
  mobileOpen,
  onMobileToggle,
  onSourceChange,
  prayerTimesCurrent,
  prayerTimeSourceSettings,
  prayerTimes,
  status,
  onChange,
  onSubmit,
}: PrayerTimesSectionProps) {
  const modeState = getPrayerTimesAdminModeState(prayerTimesCurrent);
  const lastUpdatedLabel = prayerTimeSourceSettings.updatedAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(prayerTimeSourceSettings.updatedAt))
    : "Not set yet";
  const currentSourceLabel = getPrayerTimeSourceLabel(prayerTimeSourceSettings.source);
  const displayedPrayerTimesLabel = getDisplayedPrayerTimesLabel(prayerTimesCurrent);

  return (
    <AdminSectionCard
      id={id}
      mobileOpen={mobileOpen}
      onMobileToggle={onMobileToggle}
      title="Namaz Vakitleri"
      description="Günlük namaz vakitlerini güncelleyin."
    >
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Current source: {currentSourceLabel}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Last updated: {lastUpdatedLabel}
            </p>
            {prayerTimeSourceSettings.cityName ? (
              <p className="mt-1 text-xs text-slate-500">
                City: {prayerTimeSourceSettings.cityName}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {primaryPrayerTimeSourceOptions.map((option) => {
            const isActive = prayerTimeSourceSettings.source === option.value;

            return (
              <button
                key={option.value}
                className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold transition sm:w-auto ${
                  isActive
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:border-emerald-500"
                }`}
                onClick={() => onSourceChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Saving manual prayer times updates prayerTimes/current only. It does not change this source setting.
        </p>

        {prayerTimeSourceSettings.source === "aladhan" ? (
          <p className="mt-3 text-sm text-amber-700">
            Aladhan API remains supported internally, but the main admin source options are Manual Entry and Awqat Salah API.
          </p>
        ) : null}

        {prayerTimeSourceSettings.source === "manual" ? (
          <p className="mt-3 text-sm text-amber-700">
            Automatic sync is disabled while Manual Entry is selected.
          </p>
        ) : null}

        {prayerTimeSourceSettings.source === "awqat-salah" ? (
          <p className="mt-3 text-sm text-amber-700">
            Awqat Salah API sync is not implemented yet. This only saves the source setting for now.
          </p>
        ) : null}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Geçerli mod: {modeState.label}</p>
        <p className="mt-1 text-sm text-slate-600">{modeState.description}</p>
        <p className="mt-2 text-xs font-medium text-slate-500">
          Kaynak ayarı: {currentSourceLabel} | Gösterilen vakitler: {displayedPrayerTimesLabel}
        </p>
        {prayerTimesCurrent.manualOverride && prayerTimeSourceSettings.source === "awqat-salah" ? (
          <p className="mt-2 text-xs text-slate-500">
            Awqat Salah API moduna geç seçildi. Kaydedilen manuel vakitler ekranda kalır; sonraki uygun otomatik güncelleme bu kaynağı kullanır.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {prayerInputs.map((prayer) => (
          <label className="block" key={prayer.key}>
            <span className="text-sm font-semibold text-slate-700">{prayer.label}</span>
            <input
              className={`mt-2 min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                errors[prayer.key] ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
              }`}
              onChange={(event) =>
                onChange({
                  ...prayerTimes,
                  [prayer.key]: event.target.value as PrayerTimesForDay[typeof prayer.key],
                })
              }
              type="time"
              value={prayerTimes[prayer.key]}
            />
            {errors[prayer.key] ? (
              <p className="mt-2 text-sm font-medium text-red-700">{errors[prayer.key]}</p>
            ) : null}
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto"
          onClick={onSubmit}
          type="button"
        >
          Namaz vakitlerini kaydet
        </button>
      </div>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
