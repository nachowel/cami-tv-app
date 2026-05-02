import type { PrayerTimesCurrent, PrayerTimesForDay } from "../../types/display.ts";
import { restoreEffectivePrayerTimesFromAutomatic } from "../../utils/prayerTimeDocument.ts";

const missingAutomaticTimesWarning =
  "Otomatik mod açıldı. Kayıtlı Aladhan vakti henüz bulunmadığı için mevcut değerler korunuyor. Sonraki başarılı senkronizasyonda otomatik vakitler uygulanacak.";

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

  return {
    label: "Otomatik bekleniyor",
    description:
      "TV mevcut vakitleri koruyor. Sonraki başarılı Aladhan senkronundan sonra otomatik vakitler uygulanacak.",
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
