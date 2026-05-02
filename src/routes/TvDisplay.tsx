import { useEffect, useState } from "react";
import { TvDisplayLayout } from "../components/tv/TvDisplayLayout";
import { startTvDisplaySync } from "../components/tv/tvFirestoreState.ts";
import { mockDisplayData } from "../data/mockDisplayData";
import type { DisplayData } from "../types/display";
import {
  subscribeToAnnouncements,
  subscribeToDailyContentCurrent,
  subscribeToDisplaySettings,
  subscribeToDonationCurrent,
  subscribeToPrayerTimesCurrent,
  subscribeToTickerCurrent,
} from "../services/firestoreDisplayService.ts";

export default function TvDisplay() {
  const [displayData, setDisplayData] = useState<DisplayData>(mockDisplayData);

  useEffect(() => {
    const stopSync = startTvDisplaySync({
      api: {
        subscribeToAnnouncements,
        subscribeToDailyContentCurrent,
        subscribeToDisplaySettings,
        subscribeToDonationCurrent,
        subscribeToPrayerTimesCurrent,
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

  return <TvDisplayLayout data={displayData} />;
}
