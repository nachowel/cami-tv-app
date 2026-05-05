import { useEffect, useState } from "react";
import { TvDisplayLayout } from "../components/tv/TvDisplayLayout";
import { startTvDisplaySync } from "../components/tv/tvFirestoreState.ts";
import { mockDisplayData } from "../data/mockDisplayData";
import type { DisplayData, PrayerTimesCurrent } from "../types/display";
import {
  subscribeToAnnouncements,
  subscribeToDailyContentCurrent,
  subscribeToDisplaySettings,
  subscribeToDonationCurrent,
  subscribeToPrayerTimesCurrent,
  subscribeToTickerCurrent,
} from "../services/firestoreDisplayService.ts";
import { useTvViewportLock } from "./useTvViewportLock";

export default function TvDisplay() {
  useTvViewportLock();
  const [displayData, setDisplayData] = useState<DisplayData>(mockDisplayData);
  const [prayerTimesStatus, setPrayerTimesStatus] = useState<"loading" | "ok" | "error">("loading");
  const [lastSuccessfulPrayerTimes, setLastSuccessfulPrayerTimes] = useState<PrayerTimesCurrent | null>(null);

  useEffect(() => {
    const stopSync = startTvDisplaySync({
      api: {
        subscribeToAnnouncements,
        subscribeToDailyContentCurrent,
        subscribeToDisplaySettings,
        subscribeToDonationCurrent,
        subscribeToPrayerTimesCurrent(callback, onError) {
          return subscribeToPrayerTimesCurrent(
            (value) => {
              setPrayerTimesStatus("ok");
              if (value) {
                setLastSuccessfulPrayerTimes(value);
              }
              callback(value);
            },
            (error) => {
              setPrayerTimesStatus("error");
              onError?.(error);
            },
          );
        },
        subscribeToTickerCurrent,
      },
      fallback: mockDisplayData,
      isDevelopment: import.meta.env.DEV,
      logError(section, error) {
        console.warn(`[tv] Firestore read failed for ${section}; using mock fallback.`, error);
      },
      onData: setDisplayData,
    });

    return stopSync;
  }, []);

  useEffect(() => {
    console.log("FULL PRAYER DATA", displayData.prayerTimes);
    console.log("[PRAYER SOURCE]", displayData.prayerTimes.provider, displayData.prayerTimes.updatedAt);

    if (!displayData.prayerTimes.provider) {
      console.warn("[PRAYER SOURCE] provider missing on prayerTimes/current", displayData.prayerTimes);
    }
  }, [displayData.prayerTimes]);

  return (
    <TvDisplayLayout
      data={displayData}
      lastSuccessfulPrayerTimes={lastSuccessfulPrayerTimes}
      prayerTimesStatus={prayerTimesStatus}
    />
  );
}
