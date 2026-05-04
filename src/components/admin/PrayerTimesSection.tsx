import type {
  PrayerTimeSourceSetting,
  PrayerTimeSourceSettings,
  PrayerTimesCurrent,
  PrayerTimesForDay,
} from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import { AdminSectionCard } from "./AdminSectionCard";
import {
  getPrayerTimesAdminModeState,
  shouldShowAutomaticPrayerTimesRestoreAction,
} from "./prayerTimeAdminState.ts";

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
  onAutomaticModeEnable: () => void;
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

function getPrayerTimeSourceLabel(source: PrayerTimeSourceSetting) {
  return prayerTimeSourceOptions.find((option) => option.value === source)?.label ?? source;
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
  onAutomaticModeEnable,
  onChange,
  onSubmit,
}: PrayerTimesSectionProps) {
  const modeState = getPrayerTimesAdminModeState(prayerTimesCurrent);
  const showRestoreAction = shouldShowAutomaticPrayerTimesRestoreAction(prayerTimesCurrent);
  const providerLabel = prayerTimesCurrent.providerSource ?? "yok";
  const lastUpdatedLabel = prayerTimeSourceSettings.updatedAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(prayerTimeSourceSettings.updatedAt))
    : "Not set yet";

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
              Active source: {getPrayerTimeSourceLabel(prayerTimeSourceSettings.source)}
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

          <label className="block sm:min-w-64">
            <span className="text-sm font-semibold text-slate-700">Prayer time source</span>
            <select
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
              onChange={(event) => onSourceChange(event.target.value as PrayerTimeSourceSetting)}
              value={prayerTimeSourceSettings.source}
            >
              {prayerTimeSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Saving manual prayer times updates prayerTimes/current only. It does not change this source setting.
        </p>

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
          Etkin kaynak: {prayerTimesCurrent.effectiveSource} | Sağlayıcı: {providerLabel}
        </p>
        {showRestoreAction ? (
          <>
            <p className="mt-2 hidden text-xs text-slate-500 sm:block">
              Eski kayıtlar güvenlik için manuel modda tutulur. Otomatik Aladhan senkronuna dönmek için
              aşağıdaki düğmeyi bilinçli olarak kullanın.
            </p>
            <div className="mt-3 flex justify-end">
              <button
                className="min-h-11 w-full rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-400 sm:w-auto"
                onClick={onAutomaticModeEnable}
                type="button"
              >
                Otomatik Aladhan moduna dön
              </button>
            </div>
          </>
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
