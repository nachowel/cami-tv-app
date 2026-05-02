import type {
  Announcement,
  DailyContentCurrent,
  DailyContentType,
  TickerCurrent,
  TickerType,
} from "../../types/display";
import { validateDailyContent, validateTicker } from "../../utils/validation.ts";

export interface AdminAnnouncementDraft {
  id: string;
  textEn: string;
  textTr: string;
  active: boolean;
  expiresOn: string;
}

export interface AdminDailyContentDraft {
  arabic: string;
  translationEn: string;
  translationTr: string;
  source: string;
  type: DailyContentType;
}

export interface AdminTickerDraft {
  textEn: string;
  textTr: string;
  type: TickerType;
}

export function createAnnouncementDraft(announcement?: Announcement): AdminAnnouncementDraft {
  if (!announcement) {
    return {
      id: "",
      textEn: "",
      textTr: "",
      active: true,
      expiresOn: "",
    };
  }

  return {
    id: announcement.id,
    textEn: announcement.text.en,
    textTr: announcement.text.tr,
    active: announcement.active,
    expiresOn: announcement.expires_at?.slice(0, 10) ?? "",
  };
}

export function toAnnouncementRecord(
  draft: AdminAnnouncementDraft,
  timestamp: string,
  previous?: Announcement,
): Announcement {
  return {
    id: draft.id,
    text: {
      en: draft.textEn.trim(),
      tr: draft.textTr.trim(),
    },
    active: draft.active,
    expires_at: draft.expiresOn ? `${draft.expiresOn}T23:59:59Z` : null,
    created_at: previous?.created_at ?? timestamp,
    updated_at: timestamp,
  };
}

export function upsertAnnouncement(
  announcements: Announcement[],
  nextAnnouncement: Announcement,
): Announcement[] {
  const existingIndex = announcements.findIndex((announcement) => announcement.id === nextAnnouncement.id);

  if (existingIndex === -1) {
    return [nextAnnouncement, ...announcements];
  }

  return announcements.map((announcement) =>
    announcement.id === nextAnnouncement.id ? nextAnnouncement : announcement,
  );
}

export function deleteAnnouncementById(
  announcements: Announcement[],
  announcementId: string,
): Announcement[] {
  return announcements.filter((announcement) => announcement.id !== announcementId);
}

export function createDailyContentDraft(content: DailyContentCurrent): AdminDailyContentDraft {
  return {
    arabic: content.arabic,
    translationEn: content.translation.en,
    translationTr: content.translation.tr,
    source: content.source,
    type: content.type,
  };
}

export function getDailyContentValidationErrors(draft: AdminDailyContentDraft): string[] {
  return validateDailyContent({
    arabic: draft.arabic,
    source: draft.source,
    translationEn: draft.translationEn,
    translationTr: draft.translationTr,
    type: draft.type,
  }).errors;
}

export function toPersistedDailyContent(
  draft: AdminDailyContentDraft,
  previous: DailyContentCurrent,
  timestamp: string,
): DailyContentCurrent {
  return {
    ...previous,
    arabic: draft.arabic.trim(),
    translation: {
      en: draft.translationEn.trim(),
      tr: draft.translationTr.trim(),
    },
    source: draft.source.trim(),
    type: draft.type,
    updated_at: timestamp,
  };
}

export function createTickerDraft(ticker: TickerCurrent): AdminTickerDraft {
  return {
    textEn: ticker.text.en,
    textTr: ticker.text.tr,
    type: ticker.type,
  };
}

export function getTickerValidationErrors(draft: AdminTickerDraft): string[] {
  return validateTicker({
    textEn: draft.textEn,
    textTr: draft.textTr,
    type: draft.type,
  }).errors;
}

export function toPersistedTicker(
  draft: AdminTickerDraft,
  previous: TickerCurrent,
  timestamp: string,
): TickerCurrent {
  return {
    ...previous,
    text: {
      en: draft.textEn.trim(),
      tr: draft.textTr.trim(),
    },
    type: draft.type,
    updated_at: timestamp,
  };
}
