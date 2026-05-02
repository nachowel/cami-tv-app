import test from "node:test";
import assert from "node:assert/strict";

import type { Announcement } from "../src/types/display.ts";
import { getActiveAnnouncements } from "../src/utils/announcementFilters.ts";

const baseAnnouncement: Announcement = {
  id: "announcement-1",
  text: {
    en: "Community dinner on Saturday.",
    tr: "Cumartesi topluluk yemeği.",
  },
  active: true,
  expires_at: null,
  created_at: "2026-05-01T18:00:00Z",
  updated_at: "2026-05-01T18:00:00Z",
};

test("active announcement is shown", () => {
  const announcements = getActiveAnnouncements([baseAnnouncement], new Date("2026-05-01T20:00:00Z"));

  assert.equal(announcements.length, 1);
  assert.equal(announcements[0]?.id, baseAnnouncement.id);
});

test("inactive announcement is hidden", () => {
  const announcements = getActiveAnnouncements(
    [{ ...baseAnnouncement, active: false }],
    new Date("2026-05-01T20:00:00Z"),
  );

  assert.deepEqual(announcements, []);
});

test("expired announcement is hidden", () => {
  const announcements = getActiveAnnouncements(
    [{ ...baseAnnouncement, expires_at: "2026-05-01T19:59:59Z" }],
    new Date("2026-05-01T20:00:00Z"),
  );

  assert.deepEqual(announcements, []);
});

test("future expiry announcement is shown", () => {
  const announcements = getActiveAnnouncements(
    [{ ...baseAnnouncement, expires_at: "2026-05-01T20:00:01Z" }],
    new Date("2026-05-01T20:00:00Z"),
  );

  assert.equal(announcements.length, 1);
  assert.equal(announcements[0]?.id, baseAnnouncement.id);
});

test("no expiry announcement is shown", () => {
  const announcements = getActiveAnnouncements(
    [{ ...baseAnnouncement, expires_at: null }],
    new Date("2026-05-01T20:00:00Z"),
  );

  assert.equal(announcements.length, 1);
  assert.equal(announcements[0]?.id, baseAnnouncement.id);
});
