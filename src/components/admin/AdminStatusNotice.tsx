export interface SectionStatus {
  message: string;
  tone: "error" | "info" | "saved" | "saving";
}

interface AdminStatusNoticeProps {
  status: SectionStatus | null;
}

export function AdminStatusNotice({ status }: AdminStatusNoticeProps) {
  if (!status) {
    return null;
  }

  const toneClasses =
    status.tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : status.tone === "saving"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status.tone === "info"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <p className={`mt-3 rounded-xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {status.message}
    </p>
  );
}
