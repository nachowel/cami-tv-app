export const FIRESTORE_PATHS = {
  announcementsCollection: "announcements",
  dailyContentCurrent: "dailyContent/current",
  donationCurrent: "donation/current",
  prayerTimesCurrent: "prayerTimes/current",
  prayerTimesSyncTest: "prayerTimes/syncTest",
  settingsDisplay: "settings/display",
  tickerCurrent: "ticker/current",
} as const;

export function getAnnouncementDocumentPath(announcementId: string) {
  return `${FIRESTORE_PATHS.announcementsCollection}/${announcementId}`;
}
