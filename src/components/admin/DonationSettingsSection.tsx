import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";
import { AdminSectionCard } from "./AdminSectionCard";

interface DonationSettingsSectionProps {
  amount: string;
  currency: string;
  donationUrl: string;
  errors: {
    amount?: string;
    donationUrl?: string;
  };
  status: SectionStatus | null;
  onAmountChange: (value: string) => void;
  onDonationUrlChange: (value: string) => void;
  onSubmit: () => void;
}

export function DonationSettingsSection({
  amount,
  currency,
  donationUrl,
  errors,
  status,
  onAmountChange,
  onDonationUrlChange,
  onSubmit,
}: DonationSettingsSectionProps) {
  return (
    <AdminSectionCard
      title="Bağış Bilgileri"
      description="Haftalık bağış tutarını ve bağış bağlantısını güncelleyin."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Haftalık bağış tutarı</span>
          <div
            className={`mt-2 flex items-center overflow-hidden rounded-xl border bg-white ${
              errors.amount ? "border-red-300 focus-within:border-red-500" : "border-slate-300 focus-within:border-emerald-700"
            }`}
          >
            <span className="border-r border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">
              {currency}
            </span>
            <input
              className="w-full px-3 py-2 text-sm outline-none"
              inputMode="decimal"
              onChange={(event) => onAmountChange(event.target.value)}
              type="number"
              value={amount}
            />
          </div>
          {errors.amount ? <p className="mt-2 text-sm font-medium text-red-700">{errors.amount}</p> : null}
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Bağış bağlantısı</span>
          <input
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
              errors.donationUrl ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-emerald-700"
            }`}
            onChange={(event) => onDonationUrlChange(event.target.value)}
            placeholder="https://example.org/donate"
            type="url"
            value={donationUrl}
          />
          {errors.donationUrl ? (
            <p className="mt-2 text-sm font-medium text-red-700">{errors.donationUrl}</p>
          ) : null}
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Kaydettiğinizde değişiklikler Firestore'a yazılır.</p>
        <button
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          onClick={onSubmit}
          type="button"
        >
          Bağış bilgilerini kaydet
        </button>
      </div>

      <AdminStatusNotice status={status} />
    </AdminSectionCard>
  );
}
