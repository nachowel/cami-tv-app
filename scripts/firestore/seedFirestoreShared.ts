import type { Announcement, DisplayData } from "../../src/types/display.ts";
import { FIRESTORE_PATHS, getAnnouncementDocumentPath } from "../../src/shared/firestorePaths.ts";

export interface FirestoreSeedSingletonEntry {
  data: DisplayData["settings"] | DisplayData["donation"] | DisplayData["prayerTimes"] | DisplayData["dailyContent"] | DisplayData["ticker"];
  path: string;
}

export interface FirestoreSeedAnnouncementEntry {
  data: Announcement;
  documentId: string;
  path: string;
}

export interface FirestoreSeedPlan {
  announcements: FirestoreSeedAnnouncementEntry[];
  singletons: FirestoreSeedSingletonEntry[];
}

export interface SeedTargetDecision {
  exists: boolean;
  force: boolean;
}

export interface SeedArguments {
  force: boolean;
  help: boolean;
}

export function buildFirestoreSeedPlan(source: DisplayData): FirestoreSeedPlan {
  return {
    singletons: [
      {
        data: source.settings,
        path: FIRESTORE_PATHS.settingsDisplay,
      },
      {
        data: source.donation,
        path: FIRESTORE_PATHS.donationCurrent,
      },
      {
        data: source.prayerTimes,
        path: FIRESTORE_PATHS.prayerTimesCurrent,
      },
      {
        data: source.dailyContent,
        path: FIRESTORE_PATHS.dailyContentCurrent,
      },
      {
        data: source.ticker,
        path: FIRESTORE_PATHS.tickerCurrent,
      },
    ],
    announcements: source.announcements.map((announcement) => ({
      data: announcement,
      documentId: announcement.id,
      path: getAnnouncementDocumentPath(announcement.id),
    })),
  };
}

export function shouldWriteSeedTarget({ exists, force }: SeedTargetDecision) {
  return force || !exists;
}

export function parseSeedArguments(args: string[]): SeedArguments {
  return {
    force: args.includes("--force"),
    help: args.includes("--help"),
  };
}
