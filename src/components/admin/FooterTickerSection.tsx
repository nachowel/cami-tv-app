import type { TickerType } from "../../types/display";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import type { AdminTickerDraft } from "./adminState";
import { AdminSectionCard } from "./AdminSectionCard";

interface FooterTickerSectionProps {
  draft: AdminTickerDraft;
  errors: string[];
  fieldErrors: Partial<Record<"textEn" | "textTr" | "type", string>>;
  status: SectionStatus | null;
  onChange: (draft: AdminTickerDraft) => void;
  onSubmit: () => void;
}

const tickerTypeOptions: Array<{ label: string; value: TickerType }> = [
  { label: "Hadis", value: "hadith" },
  { label: "Mesaj", value: "message" },
];

export function FooterTickerSection({
  draft,
  errors,
  fieldErrors,
  status,
  onChange,
  onSubmit,
}: FooterTickerSectionProps) {
  return (
    <AdminSectionCard
      title="Alt Şerit Yazısı"
      description="TV ekranının altındaki yeşil şeritte gösterilen metni yönetin."
    >
      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">English text</span>
          <input
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
              fieldErrors.textEn ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
            }`}
            onChange={(event) => onChange({ ...draft, textEn: event.target.value })}
            type="text"
            value={draft.textEn}
          />
          {fieldErrors.textEn ? <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.textEn}</p> : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Türkçe metin</span>
          <input
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
              fieldErrors.textTr ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
            }`}
            onChange={(event) => onChange({ ...draft, textTr: event.target.value })}
            type="text"
            value={draft.textTr}
          />
          {fieldErrors.textTr ? <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.textTr}</p> : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Tür</span>
          <select
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
              fieldErrors.type ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
            }`}
            onChange={(event) => onChange({ ...draft, type: event.target.value as TickerType })}
            value={draft.type}
          >
            {tickerTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.type ? <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.type}</p> : null}
        </label>
      </div>

      {errors.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Mevcut uzunluklar: İngilizce {draft.textEn.length}/120, Türkçe {draft.textTr.length}/120.
      </p>

      <div className="mt-4 flex justify-end">
        <button
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          onClick={onSubmit}
          type="button"
        >
          Alt şerit yazısını kaydet
        </button>
      </div>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
