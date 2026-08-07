import { useState } from 'react';
import { CHILD_INTERFACE_LEVELS, CHILD_INTERFACE_LEVEL_DESCRIPTIONS, CHILD_INTERFACE_LEVEL_LABELS } from '@banque-familiale/shared';
import { InfoIcon } from './icons.js';

/** Small "ⓘ" toggle next to the interface-level picker — explains what "Très simplifié" /
 * "Standard" / "Avancé" actually change, now that the labels no longer carry an age range. */
export function InterfaceLevelInfo() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Différences entre les niveaux d'interface"
        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <InfoIcon />
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-10 w-72 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <dl className="flex flex-col gap-2">
            {CHILD_INTERFACE_LEVELS.map((level) => (
              <div key={level}>
                <dt className="text-sm font-semibold">{CHILD_INTERFACE_LEVEL_LABELS[level]}</dt>
                <dd className="text-xs text-slate-500 dark:text-slate-400">{CHILD_INTERFACE_LEVEL_DESCRIPTIONS[level]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </span>
  );
}
