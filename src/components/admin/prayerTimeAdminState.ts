import type { PrayerTimesCurrent, PrayerTimesForDay } from "../../types/display.ts";
import { restoreEffectivePrayerTimesFromAutomatic } from "../../utils/prayerTimeDocument.ts";

const missingAutomaticTimesWarning =
  "Otomatik mod açıldı. Kayıtlı otomatik vakit henüz bulunmadığı için mevcut değerler korunuyor. Sonraki başarılı otomatik senkronda bu değerler uygulanacak.";

export interface DisableManualPrayerTimesOverrideResult {
  nextValue: PrayerTimesCurrent;
  restoredAutomaticTimes: boolean;
  warningMessage: string | null;
}

export interface PrayerTimesAdminModeState {
  description: string;
  label: string;
}

export function shouldShowAutomaticPrayerTimesRestoreAction(current: PrayerTimesCurrent) {
  return current.manualOverride;
}

export function getPrayerTimesAdminModeState(
  current: PrayerTimesCurrent,
): PrayerTimesAdminModeState {
  if (current.manualOverride) {
    return {
      label: "Manuel override",
      description: "TV şu anda manuel kaydedilen vakitleri gösteriyor.",
    };
  }

  if (current.effectiveSource === "aladhan") {
    return {
      label: "Otomatik: Aladhan",
      description: "TV şu anda Aladhan'dan gelen etkili vakitleri gösteriyor.",
    };
  }

  if (current.effectiveSource === "awqat-salah") {
    return {
      label: "Otomatik: Awqat Salah",
      description: "TV şu anda Awqat Salah'dan gelen etkili vakitleri gösteriyor.",
    };
  }

  return {
    label: "Otomatik bekleniyor",
    description:
      "TV mevcut vakitleri koruyor. Sonraki başarılı otomatik senkrondan sonra otomatik vakitler uygulanacak.",
  };
}

export function createManualPrayerTimesSaveValue(
  current: PrayerTimesCurrent,
  nextToday: PrayerTimesForDay,
  updatedAt: string,
): PrayerTimesCurrent {
  return {
    ...current,
    today: nextToday,
    updated_at: updatedAt,
    updatedAt,
    manualOverride: true,
    effectiveSource: "manual",
  };
}

export function disableManualPrayerTimesOverride(
  current: PrayerTimesCurrent,
  updatedAt: string,
): DisableManualPrayerTimesOverrideResult {
  const nextValue = restoreEffectivePrayerTimesFromAutomatic(current, updatedAt);

  if (current.automaticTimes) {
    return {
      nextValue,
      restoredAutomaticTimes: true,
      warningMessage: null,
    };
  }

  return {
    nextValue,
    restoredAutomaticTimes: false,
    warningMessage: missingAutomaticTimesWarning,
  };
}
