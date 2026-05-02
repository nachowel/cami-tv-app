import type { ReactNode } from "react";

interface AdminSectionCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminSectionCard({
  title,
  description,
  children,
}: AdminSectionCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
