import type { DailyContentType } from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import type { AdminDailyContentDraft } from "./adminState";
import { AdminSectionCard } from "./AdminSectionCard";

interface DailyContentSectionProps {
  draft: AdminDailyContentDraft;
  errors: string[];
  fieldErrors: Partial<Record<"arabic" | "translationEn" | "translationTr" | "source" | "type", string>>;
  id?: string;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  status: SectionStatus | null;
  onChange: (draft: AdminDailyContentDraft) => void;
  onSubmit: () => void;
}

const contentTypeOptions: Array<{ label: string; value: DailyContentType }> = [
  { label: "Ayet", value: "ayah" },
  { label: "Hadis", value: "hadith" },
];

export function DailyContentSection({
  draft,
  errors,
  fieldErrors,
  id,
  mobileOpen,
  onMobileToggle,
  status,
  onChange,
  onSubmit,
}: DailyContentSectionProps) {
  return (
    <AdminSectionCard
      id={id}
      mobileOpen={mobileOpen}
      onMobileToggle={onMobileToggle}
      title="Günün İçeriği"
      description="Arapça metni, çevirileri, kaynağı ve türü yönetin."
    >
      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Arapça metin</span>
          <textarea
            className={`mt-2 min-h-28 w-full rounded-xl border px-3 py-2 text-right text-sm leading-6 outline-none ${
              fieldErrors.arabic ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
            }`}
            onChange={(event) => onChange({ ...draft, arabic: event.target.value })}
            value={draft.arabic}
          />
          {fieldErrors.arabic ? <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.arabic}</p> : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">İngilizce çeviri</span>
          <textarea
            className={`mt-2 min-h-28 w-full rounded-xl border px-3 py-2 text-sm leading-6 outline-none ${
              fieldErrors.translationEn ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
            }`}
            onChange={(event) => onChange({ ...draft, translationEn: event.target.value })}
            value={draft.translationEn}
          />
          {fieldErrors.translationEn ? (
            <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.translationEn}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Türkçe çeviri</span>
          <textarea
            className={`mt-2 min-h-28 w-full rounded-xl border px-3 py-2 text-sm leading-6 outline-none ${
              fieldErrors.translationTr ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
            }`}
            onChange={(event) => onChange({ ...draft, translationTr: event.target.value })}
            value={draft.translationTr}
          />
          {fieldErrors.translationTr ? (
            <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.translationTr}</p>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Kaynak</span>
            <input
              className={`mt-2 min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                fieldErrors.source ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
              }`}
              onChange={(event) => onChange({ ...draft, source: event.target.value })}
              type="text"
              value={draft.source}
            />
            {fieldErrors.source ? <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.source}</p> : null}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Tür</span>
            <select
              className={`mt-2 min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                fieldErrors.type ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
              }`}
              onChange={(event) =>
                onChange({ ...draft, type: event.target.value as DailyContentType })
              }
              value={draft.type}
            >
              {contentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.type ? <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.type}</p> : null}
          </label>
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <p className="mt-4 hidden text-xs text-slate-500 sm:block">
        Mevcut uzunluklar: Arapça {draft.arabic.length}/180, İngilizce {draft.translationEn.length}/220,
        Türkçe {draft.translationTr.length}/220.
      </p>

      <div className="mt-4 flex justify-end">
        <button
          className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto"
          onClick={onSubmit}
          type="button"
        >
          Günün içeriğini kaydet
        </button>
      </div>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
