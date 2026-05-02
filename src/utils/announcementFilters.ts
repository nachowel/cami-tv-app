import type { Announcement } from "../types/display";

export function getActiveAnnouncements(announcements: Announcement[], now: Date) {
  return announcements.filter((announcement) => {
    if (!announcement.active) {
      return false;
    }

    if (announcement.expires_at == null) {
      return true;
    }

    return new Date(announcement.expires_at).getTime() > now.getTime();
  });
}
