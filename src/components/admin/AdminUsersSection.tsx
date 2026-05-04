import { AdminSectionCard } from "./AdminSectionCard";
import { AdminStatusNotice, type SectionStatus } from "./AdminStatusNotice";

interface AdminUsersSectionProps {
  disabledReason: string | null;
  email: string;
  enabled: boolean;
  id?: string;
  isSaving: boolean;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  onEmailChange: (email: string) => void;
  onGrant: () => void;
  onRemove: () => void;
  status: SectionStatus | null;
}

export function AdminUsersSection({
  disabledReason,
  email,
  enabled,
  id,
  isSaving,
  mobileOpen,
  onMobileToggle,
  onEmailChange,
  onGrant,
  onRemove,
  status,
}: AdminUsersSectionProps) {
  const emailPresent = email.trim().length > 0;

  return (
    <AdminSectionCard
      id={id}
      mobileOpen={mobileOpen}
      onMobileToggle={onMobileToggle}
      title="Admin Kullanıcıları"
      description="Admin yetkisini e-posta adresine göre verin veya kaldırın. İlk admin kullanıcı mevcut betikle bir kez manuel olarak eklenmelidir."
    >
      {!enabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <p>{disabledReason}</p>
          <p className="mt-2 text-amber-800">
            O zamana kadar admin eklemek veya kaldırmak için `npm run admin:set-claim` komutunu kullanın.
          </p>
        </div>
      ) : null}

      {enabled ? (
      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Admin e-posta adresi</span>
          <input
            autoComplete="email"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="someone@example.com"
            type="email"
            value={email}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:w-auto"
            disabled={isSaving || !emailPresent}
            onClick={onGrant}
            type="button"
          >
            Admin yetkisi ver
          </button>

          <button
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-auto"
            disabled={isSaving || !emailPresent}
            onClick={onRemove}
            type="button"
          >
            Admin yetkisini kaldır
          </button>
        </div>
      </div>
      ) : null}

      {enabled ? <AdminStatusNotice status={status} /> : null}
    </AdminSectionCard>
  );
}
