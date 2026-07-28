import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  wrapperClassName?: string;
  ariaLabel?: string;
}

/** Custom rounded listbox — a native <select>'s dropdown popup can't be styled (no
 * border-radius, no theming) in any mainstream browser, so a real dropdown panel is used
 * instead, built on the same open/overlay/close pattern as HeaderOverflowMenu. */
export function Select({ id, value, onChange, options, placeholder, disabled, wrapperClassName, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${wrapperClassName ?? ''}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-full border border-slate-300 bg-white py-2 pl-4 pr-3 text-left text-sm shadow-sm transition hover:border-brand-300 hover:bg-slate-50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-700 dark:hover:bg-slate-900"
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5.5 8l4.5 4.5L14.5 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full z-50 mt-2 max-h-60 w-full min-w-max overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            >
              {options.map((o) => (
                <li key={o.value} role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={
                      o.value === value
                        ? 'flex w-full items-center px-4 py-2 text-left text-sm font-medium text-brand-700 bg-brand-50 dark:bg-brand-900/40 dark:text-brand-400'
                        : 'flex w-full items-center px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
