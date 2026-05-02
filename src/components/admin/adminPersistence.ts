import type { Announcement } from "../../types/display.ts";
import { createAnnouncementDraft, toAnnouncementRecord, upsertAnnouncement, type AdminAnnouncementDraft } from "./adminState.ts";
import { deleteAnnouncementById } from "./adminState.ts";
import type { SectionStatus } from "./AdminStatusNotice";
import { isLocalFallbackAnnouncementId } from "./adminFirestoreState.ts";

const FIRESTORE_PERMISSION_DENIED_MESSAGE =
  "Yazma yetkisi yok. Çıkış yapıp tekrar giriş yapmayı deneyin. Sorun devam ederse yöneticinizle iletişime geçin.";

export function isFirestorePermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if ("code" in error && (error as { code: unknown }).code === "permission-denied") {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("permission-denied") || message.includes("insufficient permissions");
  }

  return false;
}

export interface AdminSaveResult<T> {
  committed: boolean;
  status: SectionStatus;
  valueToApply: T | null;
}

export interface AnnouncementDeleteResult {
  committed: boolean;
  nextAnnouncements: Announcement[] | null;
  nextEditingAnnouncementId: string | null;
  resetDraft: boolean;
  status: SectionStatus;
}

export interface AnnouncementSaveResult {
  committed: boolean;
  nextAnnouncements: Announcement[] | null;
  nextDraft: AdminAnnouncementDraft | null;
  nextEditingAnnouncementId: string | null;
  resetDraft: boolean;
  clearValidationErrors: boolean;
  savedAnnouncement: Announcement | null;
  status: SectionStatus;
}

interface CommitAdminSectionSaveOptions<T> {
  isAuthenticated: boolean;
  nextValue: T;
  persist: (nextValue: T) => Promise<void>;
  successMessage: string;
  timeoutMs?: number;
}

interface CommitAnnouncementSaveOptions {
  announcements: Announcement[];
  createId: () => string;
  draft: AdminAnnouncementDraft;
  isAuthenticated: boolean;
  persistSave: (announcement: Announcement) => Promise<void>;
  timestamp: string;
  timeoutMs?: number;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  return await new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`Firestore yanıtı ${timeoutMs}ms içinde gelmedi.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function createInfoStatus(message: string): SectionStatus {
  return { message, tone: "info" };
}

export function createSavingStatus(message: string): SectionStatus {
  return { message, tone: "saving" };
}

export function createSavedStatus(message: string): SectionStatus {
  return { message, tone: "saved" };
}

export function createErrorStatus(message: string): SectionStatus {
  return { message, tone: "error" };
}

export function getAdminSaveGuardStatus(isAuthenticated: boolean) {
  return isAuthenticated
    ? null
    : createErrorStatus("Değişiklikleri kaydetmek için giriş yapmalısınız.");
}

export async function commitAdminSectionSave<T>({
  isAuthenticated,
  nextValue,
  persist,
  successMessage,
  timeoutMs,
}: CommitAdminSectionSaveOptions<T>): Promise<AdminSaveResult<T>> {
  const guardStatus = getAdminSaveGuardStatus(isAuthenticated);
  if (guardStatus) {
    return {
      committed: false,
      status: guardStatus,
      valueToApply: null,
    };
  }

  try {
    await withTimeout(persist(nextValue), timeoutMs);
    return {
      committed: true,
      status: createSavedStatus(successMessage),
      valueToApply: nextValue,
    };
  } catch (error) {
    const message = isFirestorePermissionError(error)
      ? FIRESTORE_PERMISSION_DENIED_MESSAGE
      : error instanceof Error
        ? error.message
        : "Beklenmeyen Firestore hatası";

    return {
      committed: false,
      status: createErrorStatus(`Kaydetme hatası: ${message}`),
      valueToApply: null,
    };
  }
}

export function createAnnouncementPersistenceId(
  currentId: string,
  createId: () => string,
) {
  if (!currentId || isLocalFallbackAnnouncementId(currentId)) {
    return createId();
  }

  return currentId;
}

export async function commitAnnouncementSave({
  announcements,
  createId,
  draft,
  isAuthenticated,
  persistSave,
  timestamp,
  timeoutMs = 15_000,
}: CommitAnnouncementSaveOptions): Promise<AnnouncementSaveResult> {
  const nextId = createAnnouncementPersistenceId(draft.id, createId);
  const previousDraftId = draft.id;
  const previousAnnouncement =
    announcements.find((announcement) => announcement.id === previousDraftId) ??
    announcements.find((announcement) => announcement.id === nextId);
  const nextRecord = toAnnouncementRecord(
    {
      ...draft,
      id: nextId,
    },
    timestamp,
    previousAnnouncement,
  );
  const result = await commitAdminSectionSave({
    isAuthenticated,
    nextValue: nextRecord,
    persist: persistSave,
    successMessage: previousAnnouncement ? "Duyuru kaydedildi." : "Duyuru kaydedildi.",
    timeoutMs,
  });

  if (!result.valueToApply) {
    return {
      clearValidationErrors: false,
      committed: false,
      nextAnnouncements: null,
      nextDraft: null,
      nextEditingAnnouncementId: null,
      resetDraft: false,
      savedAnnouncement: null,
      status: result.status,
    };
  }

  const savedAnnouncement = result.valueToApply;
  const nextAnnouncements =
    previousDraftId && previousDraftId !== nextId
      ? currentWithoutPreviousAnnouncement(announcements, previousDraftId)
      : announcements;

  return {
    clearValidationErrors: true,
    committed: true,
    nextAnnouncements: upsertAnnouncement(nextAnnouncements, savedAnnouncement),
    nextDraft: createAnnouncementDraft(),
    nextEditingAnnouncementId: null,
    resetDraft: true,
    savedAnnouncement,
    status: result.status,
  };
}

function currentWithoutPreviousAnnouncement(
  announcements: Announcement[],
  previousDraftId: string,
) {
  return announcements.filter((announcement) => announcement.id !== previousDraftId);
}

export function canDeleteAnnouncementFromFirestore(announcementId: string) {
  return !isLocalFallbackAnnouncementId(announcementId);
}

interface CommitAnnouncementDeleteOptions {
  announcementId: string;
  announcements: Announcement[];
  editingAnnouncementId: string | null;
  isAuthenticated: boolean;
  persistDelete: (announcementId: string) => Promise<void>;
}

export async function commitAnnouncementDelete({
  announcementId,
  announcements,
  editingAnnouncementId,
  isAuthenticated,
  persistDelete,
}: CommitAnnouncementDeleteOptions): Promise<AnnouncementDeleteResult> {
  const guardStatus = getAdminSaveGuardStatus(isAuthenticated);
  if (guardStatus) {
    return {
      committed: false,
      nextAnnouncements: null,
      nextEditingAnnouncementId: null,
      resetDraft: false,
      status: guardStatus,
    };
  }

  const resetDraft = editingAnnouncementId === announcementId;
  const nextAnnouncements = deleteAnnouncementById(announcements, announcementId);
  const nextEditingAnnouncementId = resetDraft ? null : editingAnnouncementId;

  if (!canDeleteAnnouncementFromFirestore(announcementId)) {
    return {
      committed: true,
      nextAnnouncements,
      nextEditingAnnouncementId,
      resetDraft,
      status: createInfoStatus(
        "Yedek duyuru yalnızca bu ekrandan kaldırıldı. Firestore belgesi silinmedi.",
      ),
    };
  }

  try {
    await persistDelete(announcementId);
    return {
      committed: true,
      nextAnnouncements,
      nextEditingAnnouncementId,
      resetDraft,
      status: createSavedStatus("Duyuru silindi."),
    };
  } catch (error) {
    const message = isFirestorePermissionError(error)
      ? FIRESTORE_PERMISSION_DENIED_MESSAGE
      : error instanceof Error
        ? error.message
        : "Beklenmeyen Firestore hatası";

    return {
      committed: false,
      nextAnnouncements: null,
      nextEditingAnnouncementId: null,
      resetDraft: false,
      status: createErrorStatus(`Silme hatası: ${message}`),
    };
  }
}
