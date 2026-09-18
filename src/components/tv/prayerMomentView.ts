import type { PrayerMoment, PrayerName } from "../../utils/prayerTimes";

interface PrayerPanelState {
  highlightedPrayer: PrayerName | null;
  nextPrayerName: PrayerName | null;
}

function isPrayerName(name: string): name is PrayerName {
  return name !== "sunrise";
}

export function resolvePrayerPanelState(prayerMoment: PrayerMoment | null): PrayerPanelState {
  if (!prayerMoment) {
    return {
      highlightedPrayer: null,
      nextPrayerName: null,
    };
  }

  const highlightedPrayer =
    prayerMoment.currentPrayer && isPrayerName(prayerMoment.currentPrayer.name)
      ? prayerMoment.currentPrayer.name
      : prayerMoment.nextPrayer.name;

  return {
    highlightedPrayer,
    nextPrayerName: prayerMoment.nextPrayer.name,
  };
}
