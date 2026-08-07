import { useState } from 'react';
import { useSubscription } from '../hooks/useBilling.js';
import { useMembers } from '../hooks/useMembers.js';
import { DeactivateMemberModal } from './DeactivateMemberModal.js';

/** Shown when a family actively downgrades to a lower paid tier (e.g. Grande Famille →
 * Famille) while an active child count above the new limit. Nothing is ever deactivated
 * automatically — the admin picks who to deactivate, one at a time, until back under the
 * limit. Existing history for every child is preserved either way. */
export function ChildrenOverLimitBanner() {
  const subscription = useSubscription();
  const members = useMembers(!!subscription.data && subscription.data.childrenOverLimit > 0);
  const [selected, setSelected] = useState<{ id: string; firstName: string } | null>(null);

  const overLimit = subscription.data?.childrenOverLimit ?? 0;
  if (overLimit === 0) return null;

  const activeChildren = (members.data ?? []).filter((m) => m.role === 'CHILD' && m.isActive);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-700 dark:bg-amber-900/20">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
        Ton plan actuel autorise {overLimit === activeChildren.length ? 'moins' : `${activeChildren.length - overLimit}`}{' '}
        enfant{activeChildren.length - overLimit > 1 ? 's' : ''} de moins que ce que ta famille a actuellement.
      </p>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
        Choisis {overLimit > 1 ? `${overLimit} comptes enfant à désactiver` : 'un compte enfant à désactiver'} pour
        repasser sous la limite — rien n'est supprimé, l'historique reste conservé et tu peux réactiver plus tard en
        remontant de plan.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {activeChildren.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => setSelected({ id: child.id, firstName: child.firstName })}
            className="rounded-full border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            Désactiver {child.firstName}
          </button>
        ))}
      </div>

      {selected && (
        <DeactivateMemberModal
          memberId={selected.id}
          memberFirstName={selected.firstName}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
