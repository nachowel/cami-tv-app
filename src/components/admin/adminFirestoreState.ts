import type { DisplayData } from "../../types/display";

export interface AdminFirestoreBootstrap {
  announcements: DisplayData["announcements"] | null;
  dailyContent: DisplayData["dailyContent"] | null;
  donation: DisplayData["donation"] | null;
  prayerTimes: DisplayData["prayerTimes"] | null;
  settings: DisplayData["settings"] | null;
  ticker: DisplayData["ticker"] | null;
}

export const LOCAL_FALLBACK_ANNOUNCEMENT_PREFIX = "local-fallback-";

export interface AdminFallbackState {
  announcements: boolean;
  dailyContent: boolean;
  donation: boolean;
  prayerTimes: boolean;
  settings: boolean;
  ticker: boolean;
}

function joinSectionNames(sectionNames: string[]) {
  if (sectionNames.length === 0) {
    return "";
  }

  if (sectionNames.length === 1) {
    return sectionNames[0] ?? "";
  }

  if (sectionNames.length === 2) {
    return `${sectionNames[0]} ve ${sectionNames[1]}`;
  }

  return `${sectionNames.slice(0, -1).join(", ")} ve ${sectionNames.at(-1)}`;
}

function createLocalFallbackAnnouncementId(announcementId: string) {
  return `${LOCAL_FALLBACK_ANNOUNCEMENT_PREFIX}${announcementId}`;
}

export function isLocalFallbackAnnouncementId(announcementId: string) {
  return announcementId.startsWith(LOCAL_FALLBACK_ANNOUNCEMENT_PREFIX);
}

function mapFallbackAnnouncements(announcements: DisplayData["announcements"]) {
  return announcements.map((announcement) => ({
    ...announcement,
    id: isLocalFallbackAnnouncementId(announcement.id)
      ? announcement.id
      : createLocalFallbackAnnouncementId(announcement.id),
  }));
}

export function resolveAdminDisplayData(
  bootstrap: AdminFirestoreBootstrap,
  fallback: DisplayData,
) {
  const fallbackState: AdminFallbackState = {
    announcements: bootstrap.announcements == null,
    dailyContent: bootstrap.dailyContent == null,
    donation: bootstrap.donation == null,
    prayerTimes: bootstrap.prayerTimes == null,
    settings: bootstrap.settings == null,
    ticker: bootstrap.ticker == null,
  };
  const fallbackSections: string[] = [];

  if (fallbackState.settings) {
    fallbackSections.push("ayarlar");
  }

  if (fallbackState.donation) {
    fallbackSections.push("bağış bilgileri");
  }

  if (fallbackState.prayerTimes) {
    fallbackSections.push("namaz vakitleri");
  }

  if (fallbackState.dailyContent) {
    fallbackSections.push("günün içeriği");
  }

  if (fallbackState.ticker) {
    fallbackSections.push("alt şerit yazısı");
  }

  if (fallbackState.announcements) {
    fallbackSections.push("duyurular");
  }

  return {
    data: {
      announcements: bootstrap.announcements ?? mapFallbackAnnouncements(fallback.announcements),
      dailyContent: bootstrap.dailyContent ?? fallback.dailyContent,
      donation: bootstrap.donation ?? fallback.donation,
      prayerTimes: bootstrap.prayerTimes ?? fallback.prayerTimes,
      settings: bootstrap.settings ?? fallback.settings,
      ticker: bootstrap.ticker ?? fallback.ticker,
    },
    fallbackState,
    warning:
      fallbackSections.length > 0
        ? `Firestore verisi ${joinSectionNames(fallbackSections)} için alınamadı. Bu bölümlerde yedek veriler kullanılıyor.`
        : null,
  };
}
