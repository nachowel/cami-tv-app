import type { Announcement } from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import type { AdminAnnouncementDraft } from "./adminState";
import { AdminSectionCard } from "./AdminSectionCard";

interface AnnouncementsSectionProps {
  announcements: Announcement[];
  draft: AdminAnnouncementDraft;
  editingAnnouncementId: string | null;
  errors: {
    expiresOn?: string;
    textEn?: string;
    textTr?: string;
  };
  id?: string;
  isFormVisible?: boolean;
  isSubmitting: boolean;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  status: SectionStatus | null;
  onStartNew: () => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcementId: string) => void;
  onCancel: () => void;
  onDraftChange: (draft: AdminAnnouncementDraft) => void;
  onSubmit: () => void;
}

export function AnnouncementsSection({
  announcements,
  draft,
  editingAnnouncementId,
  errors,
  id,
  isFormVisible = false,
  isSubmitting,
  mobileOpen,
  onMobileToggle,
  status,
  onStartNew,
  onEdit,
  onDelete,
  onCancel,
  onDraftChange,
  onSubmit,
}: AnnouncementsSectionProps) {
  const isEditing = editingAnnouncementId !== null;
  const showForm = isFormVisible || isEditing;

  return (
    <AdminSectionCard
      id={id}
      mobileOpen={mobileOpen}
      onMobileToggle={onMobileToggle}
      title="Duyurular"
      description="Canlı TV ekranında gösterilecek iki dilli duyuruları ekleyin, düzenleyin ve silin."
    >
      <div className="space-y-3">
        {announcements.map((announcement) => (
          <article
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            key={announcement.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-slate-500">
                  {announcement.active ? "Aktif" : "Pasif"}
                  {announcement.expires_at ? ` • Bitiş ${announcement.expires_at.slice(0, 10)}` : " • Süresiz"}
                </p>
                <p className="text-sm font-semibold text-slate-900">İngilizce</p>
                <p className="text-sm leading-6 text-slate-700">{announcement.text.en || "—"}</p>
                <p className="text-sm font-semibold text-slate-900">Türkçe</p>
                <p className="text-sm leading-6 text-slate-700">{announcement.text.tr || "—"}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 sm:w-auto"
                  disabled={isSubmitting}
                  onClick={() => onEdit(announcement)}
                  type="button"
                >
                  Düzenle
                </button>
                <button
                  className="min-h-11 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 sm:w-auto"
                  disabled={isSubmitting}
                  onClick={() => onDelete(announcement.id)}
                  type="button"
                >
                  Sil
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4">
        <button
          className="min-h-11 w-full rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:w-auto"
          disabled={isSubmitting}
          onClick={onStartNew}
          type="button"
        >
          Yeni duyuru ekle
        </button>
      </div>

      <form
        className={`${showForm ? "block" : "hidden"} mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:block`}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">
              {isEditing ? "Duyuruyu düzenle" : "Yeni duyuru"}
            </h3>
            <p className="mt-1 hidden break-words text-sm text-slate-600 sm:block">
              Bu form iki dilli duyuruyu doğrudan Firestore'a kaydeder ve canlı duyuru aboneliğiyle
              `/tv` ekranını günceller.
            </p>
          </div>
          {showForm ? (
            <button
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 sm:w-auto"
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
            >
              {isEditing ? "Düzenlemeyi iptal et" : "Formu kapat"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">İngilizce metin</span>
            <textarea
              className={`mt-2 min-h-28 w-full rounded-xl border px-3 py-2 text-sm leading-6 outline-none ${
                errors.textEn ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
              }`}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, textEn: event.target.value })}
              value={draft.textEn}
            />
            {errors.textEn ? <p className="mt-2 text-sm font-medium text-red-700">{errors.textEn}</p> : null}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Türkçe metin</span>
            <textarea
              className={`mt-2 min-h-28 w-full rounded-xl border px-3 py-2 text-sm leading-6 outline-none ${
                errors.textTr ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
              }`}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, textTr: event.target.value })}
              value={draft.textTr}
            />
            {errors.textTr ? <p className="mt-2 text-sm font-medium text-red-700">{errors.textTr}</p> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Bitiş tarihi</span>
              <input
                className={`mt-2 min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  errors.expiresOn ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
                }`}
                disabled={isSubmitting}
                onChange={(event) => onDraftChange({ ...draft, expiresOn: event.target.value })}
                type="date"
                value={draft.expiresOn}
              />
              {errors.expiresOn ? <p className="mt-2 text-sm font-medium text-red-700">{errors.expiresOn}</p> : null}
            </label>

            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-3 py-2.5">
              <input
                checked={draft.active}
                className="h-4 w-4 accent-emerald-700"
                disabled={isSubmitting}
                onChange={(event) => onDraftChange({ ...draft, active: event.target.checked })}
                type="checkbox"
              />
              <span className="text-sm font-semibold text-slate-700">Aktif</span>
            </label>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Kaydediliyor..." : isEditing ? "Duyuruyu kaydet" : "Yeni duyuru ekle"}
          </button>
        </div>
      </form>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
