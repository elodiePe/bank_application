import type { ReactNode } from 'react';

const VARIANT_CLASSES = {
  neutral:
    'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
  brand:
    'bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-400 dark:hover:bg-brand-900/70',
  violet:
    'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-900/70',
  amber:
    'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/70',
  red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70',
} as const;

interface IconButtonProps {
  onClick: () => void;
  label: string;
  variant?: keyof typeof VARIANT_CLASSES;
  disabled?: boolean;
  children: ReactNode;
}

/** A round icon-only button — label doubles as aria-label and hover tooltip, since there's no
 * visible text to describe the action. */
export function IconButton({ onClick, label, variant = 'neutral', disabled, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-60 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </button>
  );
}
