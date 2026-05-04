import type { PrayerMoment, PrayerName } from "../../utils/prayerTimes";

interface PrayerPanelState {
  highlightedPrayer: PrayerName;
  nextPrayerName: PrayerName;
}

function isPrayerName(name: string): name is PrayerName {
  return name !== "sunrise";
}

export function resolvePrayerPanelState(prayerMoment: PrayerMoment): PrayerPanelState {
  const highlightedPrayer =
    prayerMoment.currentPrayer && isPrayerName(prayerMoment.currentPrayer.name)
      ? prayerMoment.currentPrayer.name
      : prayerMoment.nextPrayer.name;

  return {
    highlightedPrayer,
    nextPrayerName: prayerMoment.nextPrayer.name,
  };
}
