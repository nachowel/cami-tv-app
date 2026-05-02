import test from "node:test";
import assert from "node:assert/strict";

import type { Announcement, DailyContentCurrent, TickerCurrent } from "../src/types/display.ts";
import {
  createAnnouncementDraft,
  createDailyContentDraft,
  createTickerDraft,
  deleteAnnouncementById,
  getDailyContentValidationErrors,
  getTickerValidationErrors,
  toAnnouncementRecord,
  toPersistedDailyContent,
  toPersistedTicker,
  upsertAnnouncement,
} from "../src/components/admin/adminState.ts";

const baseAnnouncement: Announcement = {
  id: "announcement-1",
  text: {
    en: "Community dinner on Saturday.",
    tr: "Cumartesi topluluk yemeği.",
  },
  active: true,
  expires_at: "2026-06-01T23:59:59Z",
  created_at: "2026-05-01T18:00:00Z",
  updated_at: "2026-05-01T18:00:00Z",
};

const baseDailyContent: DailyContentCurrent = {
  arabic: "Short Arabic text",
  translation: {
    en: "Short English text",
    tr: "Kisa Turkce metin",
  },
  source: "Nisa 31",
  type: "ayah",
  updated_at: "2026-05-01T18:00:00Z",
};

const baseTicker: TickerCurrent = {
  text: {
    en: "Cleanliness is part of faith.",
    tr: "Temizlik imandandır.",
  },
  type: "hadith",
  updated_at: "2026-05-01T18:00:00Z",
};

test("createAnnouncementDraft maps an announcement into editable form fields", () => {
  const draft = createAnnouncementDraft(baseAnnouncement);

  assert.equal(draft.id, baseAnnouncement.id);
  assert.equal(draft.textEn, baseAnnouncement.text.en);
  assert.equal(draft.textTr, baseAnnouncement.text.tr);
  assert.equal(draft.active, true);
  assert.equal(draft.expiresOn, "2026-06-01");
});

test("toAnnouncementRecord converts a draft back into the display record shape", () => {
  const record = toAnnouncementRecord(
    {
      id: "announcement-2",
      textEn: "English text",
      textTr: "Turkce metin",
      active: false,
      expiresOn: "2026-07-05",
    },
    "2026-05-02T10:00:00Z",
  );

  assert.equal(record.id, "announcement-2");
  assert.deepEqual(record.text, { en: "English text", tr: "Turkce metin" });
  assert.equal(record.active, false);
  assert.equal(record.expires_at, "2026-07-05T23:59:59Z");
  assert.equal(record.created_at, "2026-05-02T10:00:00Z");
  assert.equal(record.updated_at, "2026-05-02T10:00:00Z");
});

test("upsertAnnouncement prepends new announcements and replaces existing ones by id", () => {
  const added = upsertAnnouncement([baseAnnouncement], {
    ...baseAnnouncement,
    id: "announcement-2",
  });

  assert.deepEqual(
    added.map((announcement) => announcement.id),
    ["announcement-2", "announcement-1"],
  );

  const updated = upsertAnnouncement(added, {
    ...baseAnnouncement,
    text: { en: "Updated", tr: "Guncel" },
  });

  assert.equal(updated.length, 2);
  assert.equal(updated[1]?.text.en, "Updated");
  assert.equal(updated[1]?.text.tr, "Guncel");
});

test("deleteAnnouncementById removes the matching announcement only", () => {
  const remaining = deleteAnnouncementById(
    [baseAnnouncement, { ...baseAnnouncement, id: "announcement-2" }],
    "announcement-1",
  );

  assert.deepEqual(
    remaining.map((announcement) => announcement.id),
    ["announcement-2"],
  );
});

test("createDailyContentDraft prepares bilingual translation fields from the current model", () => {
  const draft = createDailyContentDraft(baseDailyContent);

  assert.equal(draft.arabic, baseDailyContent.arabic);
  assert.equal(draft.translationEn, baseDailyContent.translation.en);
  assert.equal(draft.translationTr, baseDailyContent.translation.tr);
  assert.equal(draft.source, baseDailyContent.source);
  assert.equal(draft.type, baseDailyContent.type);
});

test("getDailyContentValidationErrors applies the existing validator to both translation fields", () => {
  const errors = getDailyContentValidationErrors({
    arabic: "a".repeat(181),
    translationEn: "b".repeat(221),
    translationTr: "c".repeat(221),
    source: "Nisa 31",
    type: "ayah",
  });

  assert.ok(errors.includes("Arapça metin TV ekranı için çok uzun (en fazla 180 karakter)."));
  assert.ok(errors.includes("İngilizce çeviri TV ekranı için çok uzun (en fazla 220 karakter)."));
  assert.ok(errors.includes("Türkçe çeviri TV ekranı için çok uzun (en fazla 220 karakter)."));
});

test("toPersistedDailyContent preserves both localized translations in the shared model", () => {
  const persisted = toPersistedDailyContent(
    {
      arabic: "Updated Arabic",
      translationEn: "Updated English",
      translationTr: "Guncel Turkce",
      source: "Hadith source",
      type: "hadith",
    },
    baseDailyContent,
    "2026-05-03T11:00:00Z",
  );

  assert.equal(persisted.arabic, "Updated Arabic");
  assert.deepEqual(persisted.translation, {
    en: "Updated English",
    tr: "Guncel Turkce",
  });
  assert.equal(persisted.source, "Hadith source");
  assert.equal(persisted.type, "hadith");
  assert.equal(persisted.updated_at, "2026-05-03T11:00:00Z");
});

test("createTickerDraft maps ticker into editable form fields", () => {
  const draft = createTickerDraft(baseTicker);

  assert.equal(draft.textEn, baseTicker.text.en);
  assert.equal(draft.textTr, baseTicker.text.tr);
  assert.equal(draft.type, baseTicker.type);
});

test("getTickerValidationErrors applies the ticker validator", () => {
  const errors = getTickerValidationErrors({ textEn: "", textTr: "", type: "hadith" });

  assert.ok(errors.includes("En az bir dilde metin gerekli."));
});

test("toPersistedTicker preserves localized text and updates timestamp", () => {
  const persisted = toPersistedTicker(
    { textEn: "Updated English", textTr: "Guncel Turkce", type: "message" },
    baseTicker,
    "2026-05-03T11:00:00Z",
  );

  assert.deepEqual(persisted.text, { en: "Updated English", tr: "Guncel Turkce" });
  assert.equal(persisted.type, "message");
  assert.equal(persisted.updated_at, "2026-05-03T11:00:00Z");
});
