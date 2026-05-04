import type { ReactNode } from "react";

interface AdminSectionCardProps {
  id?: string;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminSectionCard({
  id,
  mobileOpen,
  onMobileToggle,
  title,
  description,
  children,
}: AdminSectionCardProps) {
  const contentId = id ? `${id}-content` : undefined;
  const isMobileAccordion = mobileOpen !== undefined && onMobileToggle !== undefined;
  const isClosedMobileAccordion = isMobileAccordion && !mobileOpen;

  return (
    <section
      className={`scroll-mt-24 border border-slate-200 bg-white shadow-sm sm:scroll-mt-28 ${
        isClosedMobileAccordion ? "rounded-xl p-0 sm:rounded-2xl sm:p-6" : "rounded-2xl p-4 sm:p-6"
      }`}
      id={id}
    >
      <div
        className={
          isClosedMobileAccordion
            ? "sm:border-b sm:border-slate-100 sm:pb-4"
            : "border-b border-slate-100 pb-3 sm:pb-4"
        }
      >
        {isMobileAccordion ? (
          <button
            aria-controls={contentId}
            aria-expanded={mobileOpen}
            className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left sm:hidden"
            onClick={onMobileToggle}
            type="button"
          >
            <span className="text-base font-bold text-slate-950">{title}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              {mobileOpen ? "Kapat" : "Aç"}
            </span>
          </button>
        ) : null}
        <div className={isMobileAccordion ? "hidden sm:block" : undefined}>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="mt-1 hidden text-sm leading-6 text-slate-600 sm:block">{description}</p>
        </div>
      </div>
      <div
        className={
          isMobileAccordion
            ? `${mobileOpen ? "mt-4 block" : "hidden"} sm:mt-5 sm:block`
            : "mt-5"
        }
        id={contentId}
      >
        {children}
      </div>
    </section>
  );
}
