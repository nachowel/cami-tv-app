import type {
  PrayerTimeSourceSetting,
  PrayerTimeSourceSettings,
  PrayerTimesCurrent,
  PrayerTimesForDay,
} from "../../types/display.ts";
import { restoreEffectivePrayerTimesFromAutomatic } from "../../utils/prayerTimeDocument.ts";

const missingAutomaticTimesWarning =
  "Otomatik mod açıldı. Kayıtlı otomatik vakit henüz bulunmadığı için mevcut değerler korunuyor. Sonraki başarılı otomatik senkronda bu değerler uygulanacak.";
const RECENT_AWQAT_SYNC_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export interface DisableManualPrayerTimesOverrideResult {
  nextValue: PrayerTimesCurrent;
  restoredAutomaticTimes: boolean;
  warningMessage: string | null;
}

export interface PrayerTimesAdminModeState {
  description: string;
  label: string;
}

export interface PrayerTimesAdminSourceSummary {
  configuredSourceLabel: string;
  displayedPrayerTimesLabel: string;
  effectiveSourceLabel: string;
  manualOverrideWarning: string | null;
  restoreAutomaticActionLabel: string | null;
  statusMessage: string | null;
  statusTone: "info" | "success" | "warning" | null;
}

export interface PrayerTimeSourceSelectionUpdate {
  nextPrayerTimesCurrent: PrayerTimesCurrent | null;
  nextSettings: PrayerTimeSourceSettings;
  userMessage: string;
}

const prayerTimeSourceLabels: Record<PrayerTimeSourceSetting, string> = {
  aladhan: "Aladhan API",
  "awqat-salah": "Awqat Salah API",
  manual: "Manual Entry",
};

function getPrayerTimeSourceLabel(source: PrayerTimeSourceSetting) {
  return prayerTimeSourceLabels[source] ?? source;
}

function isDisplayingManualPrayerTimes(current: PrayerTimesCurrent) {
  return current.manualOverride && current.effectiveSource === "manual";
}

function readPrayerTimesUpdatedAt(current: PrayerTimesCurrent) {
  return current.updatedAt ?? current.updated_at ?? current.fetchedAt;
}

function isRecentAwqatSync(current: PrayerTimesCurrent, now: Date) {
  const updatedAt = readPrayerTimesUpdatedAt(current);

  if (!updatedAt) {
    return false;
  }

  const updatedAtMs = new Date(updatedAt).getTime();
  const nowMs = now.getTime();

  return Number.isFinite(updatedAtMs) &&
    Number.isFinite(nowMs) &&
    updatedAtMs <= nowMs &&
    nowMs - updatedAtMs <= RECENT_AWQAT_SYNC_MAX_AGE_MS;
}

function hasAutomaticAwqatData(current: PrayerTimesCurrent) {
  return current.automaticTimes != null &&
    (current.providerSource === "awqat-salah" ||
      current.source === "awqat" ||
      current.provider === "awqat" ||
      current.effectiveSource === "awqat-salah");
}

export function shouldShowAutomaticPrayerTimesRestoreAction(current: PrayerTimesCurrent) {
  return current.manualOverride && hasAutomaticAwqatData(current);
}

export function getPrayerTimesAdminModeState(
  current: PrayerTimesCurrent,
): PrayerTimesAdminModeState {
  if (isDisplayingManualPrayerTimes(current)) {
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

export function getPrayerTimesAdminSourceSummary(
  settings: PrayerTimeSourceSettings,
  current: PrayerTimesCurrent,
  now = new Date(),
): PrayerTimesAdminSourceSummary {
  const configuredSourceLabel = getPrayerTimeSourceLabel(settings.source);
  const effectiveSourceLabel = getPrayerTimeSourceLabel(current.effectiveSource);
  const displayedPrayerTimesLabel = isDisplayingManualPrayerTimes(current)
    ? "Manual Entry"
    : effectiveSourceLabel;
  const manualOverrideWarning = isDisplayingManualPrayerTimes(current)
    ? "Manual override is active. The display is currently showing manually saved prayer times."
    : null;
  const restoreAutomaticActionLabel = shouldShowAutomaticPrayerTimesRestoreAction(current)
    ? "Switch display back to automatic Awqat times"
    : null;

  if (
    settings.source === "awqat-salah" &&
    current.effectiveSource === "awqat-salah" &&
    isRecentAwqatSync(current, now)
  ) {
    return {
      configuredSourceLabel,
      displayedPrayerTimesLabel,
      effectiveSourceLabel,
      manualOverrideWarning,
      restoreAutomaticActionLabel,
      statusMessage: "Awqat Salah API sync active.",
      statusTone: "success",
    };
  }

  if (settings.source === "awqat-salah" && current.effectiveSource === "aladhan") {
    return {
      configuredSourceLabel,
      displayedPrayerTimesLabel,
      effectiveSourceLabel,
      manualOverrideWarning,
      restoreAutomaticActionLabel,
      statusMessage: "Automatic updates are currently unavailable. Awqat Salah is configured, but displayed times are currently using the Aladhan fallback.",
      statusTone: "warning",
    };
  }

  if (settings.source === "awqat-salah") {
    return {
      configuredSourceLabel,
      displayedPrayerTimesLabel,
      effectiveSourceLabel,
      manualOverrideWarning,
      restoreAutomaticActionLabel,
      statusMessage: current.automaticTimes
        ? "Automatic sync is scheduled. Automatic provider selected, waiting for next sync."
        : "Automatic sync is scheduled. Automatic provider selected, waiting for next sync.",
      statusTone: "info",
    };
  }

  if (settings.source === "manual") {
    return {
      configuredSourceLabel,
      displayedPrayerTimesLabel,
      effectiveSourceLabel,
      manualOverrideWarning,
      restoreAutomaticActionLabel,
      statusMessage: "Automatic sync is disabled while Manual Entry is selected.",
      statusTone: "warning",
    };
  }

  return {
    configuredSourceLabel,
    displayedPrayerTimesLabel,
    effectiveSourceLabel,
    manualOverrideWarning,
    restoreAutomaticActionLabel,
    statusMessage: "Aladhan API remains supported internally, but the main admin source options are Manual Entry and Awqat Salah API.",
    statusTone: "warning",
  };
}

export function createPrayerTimeSourceSelectionUpdate(input: {
  currentPrayerTimes: PrayerTimesCurrent;
  currentSettings: PrayerTimeSourceSettings;
  nextSource: PrayerTimeSourceSetting;
  updatedAt: string;
  updatedBy: string;
}): PrayerTimeSourceSelectionUpdate {
  const nextSettings: PrayerTimeSourceSettings = {
    ...input.currentSettings,
    source: input.nextSource,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
  };

  if (input.nextSource !== "awqat-salah") {
    return {
      nextPrayerTimesCurrent: null,
      nextSettings,
      userMessage: "Prayer time source saved.",
    };
  }

  if (hasAutomaticAwqatData(input.currentPrayerTimes)) {
    return {
      nextPrayerTimesCurrent: restoreEffectivePrayerTimesFromAutomatic(
        input.currentPrayerTimes,
        input.updatedAt,
      ),
      nextSettings,
      userMessage: "Awqat Salah source saved. Display switched back to automatic Awqat times.",
    };
  }

  return {
    nextPrayerTimesCurrent: null,
    nextSettings,
    userMessage: "Awqat Salah source saved. Automatic provider selected, waiting for next sync.",
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
