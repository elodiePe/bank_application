import { useState, type ReactNode } from 'react';

/** A labeled, collapsible group of settings cards — Paramètres has enough sections (Général,
 * Argent, Famille, Mon compte, Zone sensible) that showing everything open at once makes the
 * page hard to scan, so each group tucks away behind its own header until tapped. */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between bg-white px-4 py-3 text-left hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {title}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5.5 8l4.5 4.5L14.5 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="space-y-3 bg-slate-50 p-3 dark:bg-slate-900/40">{children}</div>}
    </section>
  );
}
