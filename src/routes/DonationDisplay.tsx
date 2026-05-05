import { useEffect, useState } from "react";
import { useTvViewportLock } from "../routes/useTvViewportLock";
import { DonationDisplayLayout } from "../components/tv/DonationDisplayLayout";
import {
  DEFAULT_DONATION_DISPLAY_CONFIG,
  normalizeDonationDisplayConfig,
  subscribeToDonationDisplayConfig,
} from "../services/firestoreDisplayService.ts";
import type { DonationDisplayConfig } from "../types/display";

export default function DonationDisplay() {
  useTvViewportLock();
  const [config, setConfig] = useState<DonationDisplayConfig>(DEFAULT_DONATION_DISPLAY_CONFIG);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToDonationDisplayConfig(
        (value) => {
          setConfig(normalizeDonationDisplayConfig(value));
        },
        (error) => {
          console.error("[donation] Firestore subscription error:", error);
        },
      );
    } catch (error) {
      console.error("[donation] Firestore setup failed:", error);
    }

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  // ALWAYS render — never return null
  const safeConfig = config ?? DEFAULT_DONATION_DISPLAY_CONFIG;

  return <DonationDisplayLayout config={safeConfig} />;
}