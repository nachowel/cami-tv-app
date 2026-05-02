export const FIRESTORE_PATHS = {
  announcementsCollection: "announcements",
  dailyContentCurrent: "dailyContent/current",
  donationCurrent: "donation/current",
  prayerTimesCurrent: "prayerTimes/current",
  prayerTimesSyncTest: "prayerTimes/syncTest",
  settingsDisplay: "settings/display",
  tickerCurrent: "ticker/current",
} as const;

const FIRESTORE_DOCUMENT_PREFIX = /^projects\/[^/]+\/databases\/\(default\)\/documents\//;

export function normalizeFirestoreDocumentPath(path: string) {
  return path.trim().replace(FIRESTORE_DOCUMENT_PREFIX, "");
}

export function getAnnouncementDocumentPath(announcementId: string) {
  return `${FIRESTORE_PATHS.announcementsCollection}/${announcementId}`;
}
