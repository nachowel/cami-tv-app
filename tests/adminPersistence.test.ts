import test from "node:test";
import assert from "node:assert/strict";

import {
  canDeleteAnnouncementFromFirestore,
  commitAnnouncementSave,
  commitAnnouncementDelete,
  commitAdminSectionSave,
  createAnnouncementPersistenceId,
  getAdminSaveGuardStatus,
  isFirestorePermissionError,
} from "../src/components/admin/adminPersistence.ts";
import type { Announcement } from "../src/types/display.ts";

test("unauthenticated save is blocked before Firestore write", async () => {
  let called = false;

  const result = await commitAdminSectionSave({
    isAuthenticated: false,
    nextValue: { value: 1 },
    persist: async () => {
      called = true;
    },
    savingMessage: "Saving...",
    successMessage: "Kaydedildi.",
  });

  assert.equal(called, false);
  assert.equal(result.committed, false);
  assert.equal(result.valueToApply, null);
  assert.equal(result.status.tone, "error");
  assert.equal(result.status.message, "Değişiklikleri kaydetmek için giriş yapmalısınız.");
  assert.equal(getAdminSaveGuardStatus(false)?.tone, "error");
});

test("failed Firestore save returns error status and never returns a saved state", async () => {
  const result = await commitAdminSectionSave({
    isAuthenticated: true,
    nextValue: { value: 2 },
    persist: async () => {
      throw new Error("permission-denied");
    },
    savingMessage: "Saving...",
    successMessage: "Kaydedildi.",
  });

  assert.equal(result.committed, false);
  assert.equal(result.valueToApply, null);
  assert.equal(result.status.tone, "error");
  assert.ok(result.status.message.includes("Yazma yetkisi yok"), `Expected permission message, got: ${result.status.message}`);
});

test("non-permission Firestore save error returns the original error message", async () => {
  const result = await commitAdminSectionSave({
    isAuthenticated: true,
    nextValue: { value: 2 },
    persist: async () => {
      throw new Error("network error");
    },
    savingMessage: "Saving...",
    successMessage: "Kaydedildi.",
  });

  assert.equal(result.committed, false);
  assert.equal(result.status.tone, "error");
  assert.equal(result.status.message, "Kaydetme hatası: network error");
});

test("successful save returns the canonical next value and saved status", async () => {
  const result = await commitAdminSectionSave({
    isAuthenticated: true,
    nextValue: { value: 3 },
    persist: async () => {},
    savingMessage: "Saving...",
    successMessage: "Kaydedildi.",
  });

  assert.equal(result.committed, true);
  assert.deepEqual(result.valueToApply, { value: 3 });
  assert.equal(result.status.tone, "saved");
  assert.equal(result.status.message, "Kaydedildi.");
});

test("commitAnnouncementSave triggers a Firestore-backed write for a new announcement and resets the form state", async () => {
  const persistedAnnouncements: Announcement[] = [];

  const result = await commitAnnouncementSave({
    announcements: [],
    createId: () => "announcement-new",
    draft: {
      id: "",
      textEn: "  New English announcement  ",
      textTr: "  Yeni Turkce duyuru  ",
      active: true,
      expiresOn: "",
    },
    isAuthenticated: true,
    persistSave: async (announcement) => {
      persistedAnnouncements.push(announcement);
    },
    timestamp: "2026-05-02T12:00:00.000Z",
  });

  assert.equal(persistedAnnouncements.length, 1);
  assert.deepEqual(persistedAnnouncements[0], {
    id: "announcement-new",
    active: true,
    created_at: "2026-05-02T12:00:00.000Z",
    expires_at: null,
    text: {
      en: "New English announcement",
      tr: "Yeni Turkce duyuru",
    },
    updated_at: "2026-05-02T12:00:00.000Z",
  });
  assert.equal(result.committed, true);
  assert.equal(result.status.tone, "saved");
  assert.equal(result.status.message, "Duyuru kaydedildi.");
  assert.equal(result.clearValidationErrors, true);
  assert.equal(result.nextEditingAnnouncementId, null);
  assert.equal(result.resetDraft, true);
  assert.deepEqual(result.nextDraft, {
    id: "",
    textEn: "",
    textTr: "",
    active: true,
    expiresOn: "",
  });
  assert.equal(result.nextAnnouncements?.[0]?.id, "announcement-new");
  assert.equal(result.savedAnnouncement?.id, "announcement-new");
});

test("commitAnnouncementSave returns an error state when the Firestore write fails", async () => {
  const result = await commitAnnouncementSave({
    announcements: [],
    createId: () => "announcement-new",
    draft: {
      id: "",
      textEn: "English",
      textTr: "Turkce",
      active: true,
      expiresOn: "2026-05-30",
    },
    isAuthenticated: true,
    persistSave: async () => {
      throw new Error("permission-denied");
    },
    timestamp: "2026-05-02T12:00:00.000Z",
  });

  assert.equal(result.committed, false);
  assert.equal(result.nextAnnouncements, null);
  assert.equal(result.nextDraft, null);
  assert.equal(result.clearValidationErrors, false);
  assert.equal(result.savedAnnouncement, null);
  assert.equal(result.status.tone, "error");
  assert.ok(result.status.message.includes("Yazma yetkisi yok"), `Expected permission message, got: ${result.status.message}`);
});

test("commitAnnouncementSave never leaves the UI stuck in saving when Firestore does not acknowledge the write", async () => {
  const result = await commitAnnouncementSave({
    announcements: [],
    createId: () => "announcement-stalled",
    draft: {
      id: "",
      textEn: "English",
      textTr: "Turkce",
      active: true,
      expiresOn: "",
    },
    isAuthenticated: true,
    persistSave: async () => await new Promise<void>(() => {}),
    timestamp: "2026-05-02T12:00:00.000Z",
    timeoutMs: 5,
  });

  assert.equal(result.committed, false);
  assert.equal(result.status.tone, "error");
  assert.equal(
    result.status.message,
    "Kaydetme hatası: Firestore yanıtı 5ms içinde gelmedi.",
  );
});

test("announcement IDs become stable Firestore IDs for new and fallback-backed records", () => {
  assert.equal(
    createAnnouncementPersistenceId("", () => "announcement-new"),
    "announcement-new",
  );
  assert.equal(
    createAnnouncementPersistenceId("local-fallback-announcement-1", () => "announcement-firestore"),
    "announcement-firestore",
  );
  assert.equal(
    createAnnouncementPersistenceId("announcement-real", () => "announcement-other"),
    "announcement-real",
  );
});

test("fallback-backed announcements never attempt Firestore delete by local placeholder id", () => {
  assert.equal(canDeleteAnnouncementFromFirestore("local-fallback-announcement-1"), false);
  assert.equal(canDeleteAnnouncementFromFirestore("announcement-real"), true);
});

test("fallback-backed announcement delete stays local and never calls Firestore", async () => {
  const announcements: Announcement[] = [
    {
      id: "local-fallback-announcement-1",
      active: true,
      created_at: "2026-05-01T10:00:00.000Z",
      expires_at: null,
      text: {
        en: "Fallback English",
        tr: "Fallback Turkish",
      },
      updated_at: "2026-05-01T10:00:00.000Z",
    },
  ];
  let called = false;

  const result = await commitAnnouncementDelete({
    announcementId: "local-fallback-announcement-1",
    announcements,
    editingAnnouncementId: "local-fallback-announcement-1",
    isAuthenticated: true,
    persistDelete: async () => {
      called = true;
    },
  });

  assert.equal(called, false);
  assert.equal(result.committed, true);
  assert.equal(result.nextAnnouncements.length, 0);
  assert.equal(result.nextEditingAnnouncementId, null);
  assert.equal(result.resetDraft, true);
  assert.equal(result.status.tone, "info");
  assert.equal(result.status.message, "Yedek duyuru yalnızca bu ekrandan kaldırıldı. Firestore belgesi silinmedi.");
});

test("real Firestore announcement delete failure preserves local state and surfaces an error", async () => {
  const announcements: Announcement[] = [
    {
      id: "announcement-real",
      active: true,
      created_at: "2026-05-01T10:00:00.000Z",
      expires_at: null,
      text: {
        en: "Firestore English",
        tr: "Firestore Turkish",
      },
      updated_at: "2026-05-01T10:00:00.000Z",
    },
  ];

  const result = await commitAnnouncementDelete({
    announcementId: "announcement-real",
    announcements,
    editingAnnouncementId: "announcement-real",
    isAuthenticated: true,
    persistDelete: async () => {
      throw new Error("permission-denied");
    },
  });

  assert.equal(result.committed, false);
  assert.equal(result.nextAnnouncements, null);
  assert.equal(result.nextEditingAnnouncementId, null);
  assert.equal(result.resetDraft, false);
  assert.equal(result.status.tone, "error");
  assert.ok(result.status.message.includes("Yazma yetkisi yok"), `Expected permission message, got: ${result.status.message}`);
});

test("real Firestore announcement delete success returns canonical local state updates", async () => {
  const announcements: Announcement[] = [
    {
      id: "announcement-real",
      active: true,
      created_at: "2026-05-01T10:00:00.000Z",
      expires_at: null,
      text: {
        en: "Firestore English",
        tr: "Firestore Turkish",
      },
      updated_at: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "announcement-other",
      active: true,
      created_at: "2026-05-01T10:05:00.000Z",
      expires_at: null,
      text: {
        en: "Other English",
        tr: "Other Turkish",
      },
      updated_at: "2026-05-01T10:05:00.000Z",
    },
  ];

  const result = await commitAnnouncementDelete({
    announcementId: "announcement-real",
    announcements,
    editingAnnouncementId: "announcement-real",
    isAuthenticated: true,
    persistDelete: async () => {},
  });

  assert.equal(result.committed, true);
  assert.deepEqual(result.nextAnnouncements, [announcements[1]]);
  assert.equal(result.nextEditingAnnouncementId, null);
  assert.equal(result.resetDraft, true);
  assert.equal(result.status.tone, "saved");
  assert.equal(result.status.message, "Duyuru silindi.");
});

test("isFirestorePermissionError detects Firebase permission-denied error code", () => {
  const error = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
  assert.equal(isFirestorePermissionError(error), true);
});

test("isFirestorePermissionError detects permission-denied in error message", () => {
  assert.equal(isFirestorePermissionError(new Error("permission-denied")), true);
  assert.equal(isFirestorePermissionError(new Error("Missing or insufficient permissions")), true);
  assert.equal(isFirestorePermissionError(new Error("PERMISSION-DENIED")), true);
  assert.equal(isFirestorePermissionError(new Error("Insufficient Permissions for this operation")), true);
});

test("isFirestorePermissionError returns false for non-permission errors", () => {
  assert.equal(isFirestorePermissionError(new Error("network error")), false);
  assert.equal(isFirestorePermissionError(new Error("timeout")), false);
  assert.equal(isFirestorePermissionError(Object.assign(new Error("not found"), { code: "not-found" })), false);
});

test("isFirestorePermissionError returns false for null, undefined, and non-objects", () => {
  assert.equal(isFirestorePermissionError(null), false);
  assert.equal(isFirestorePermissionError(undefined), false);
  assert.equal(isFirestorePermissionError("string"), false);
  assert.equal(isFirestorePermissionError(42), false);
});

test("commitAdminSectionSave surfaces permission-denied message for Firestore permission errors", async () => {
  const permissionError = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });

  const result = await commitAdminSectionSave({
    isAuthenticated: true,
    nextValue: { test: "data" },
    persist: async () => { throw permissionError; },
    successMessage: "Kaydedildi.",
  });

  assert.equal(result.committed, false);
  assert.equal(result.valueToApply, null);
  assert.equal(result.status.tone, "error");
  assert.ok(result.status.message.includes("Yazma yetkisi yok"), `Expected permission message, got: ${result.status.message}`);
});

test("commitAnnouncementDelete surfaces permission-denied message for Firestore permission errors", async () => {
  const permissionError = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });

  const result = await commitAnnouncementDelete({
    announcementId: "announcement-1",
    announcements: [{ id: "announcement-1", active: true, created_at: "2026-01-01", expires_at: null, text: { en: "Test", tr: "Test" }, updated_at: "2026-01-01" }],
    editingAnnouncementId: "announcement-1",
    isAuthenticated: true,
    persistDelete: async () => { throw permissionError; },
  });

  assert.equal(result.committed, false);
  assert.equal(result.status.tone, "error");
  assert.ok(result.status.message.includes("Yazma yetkisi yok"), `Expected permission message, got: ${result.status.message}`);
});
