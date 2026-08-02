import type { FamilyMemberDetail } from '@banque-familiale/shared';

/** Shared by the meal plan's rotation order and each laundry type's rotation order: an ordered
 * list of turns, each turn being one or more people doing it together (e.g. "kids team up on
 * laundry" or "Papa + Maman cook together every third week"). Each member holds exactly one
 * turn — picking them into a different turn's "+ ensemble" select moves them there (removing
 * them from wherever they were), rather than requiring them to be manually removed first. */
export function GroupOrderEditor({
  members,
  groups,
  onChange,
}: {
  members: FamilyMemberDetail[];
  groups: string[][];
  onChange: (next: string[][]) => void;
}) {
  const usedIds = new Set(groups.flat());
  const unused = members.filter((m) => !usedIds.has(m.id));
  const firstNameOf = (id: string) => members.find((m) => m.id === id)?.firstName ?? '?';

  function addNewTurn(memberId: string) {
    onChange([...groups.map((g) => g.filter((id) => id !== memberId)).filter((g) => g.length > 0), [memberId]]);
  }

  function moveIntoGroup(groupIndex: number, memberId: string) {
    onChange(
      groups
        .map((g, i) => {
          if (i === groupIndex) return g.includes(memberId) ? g : [...g, memberId];
          return g.filter((id) => id !== memberId);
        })
        .filter((g) => g.length > 0),
    );
  }

  function removeFromGroup(groupIndex: number, memberId: string) {
    onChange(
      groups
        .map((g, i) => (i === groupIndex ? g.filter((id) => id !== memberId) : g))
        .filter((g) => g.length > 0),
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {unused.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => addNewTurn(m.id)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30"
          >
            + {m.firstName}
          </button>
        ))}
      </div>
      {groups.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {groups.map((group, index) => {
            const eligible = members.filter((m) => !group.includes(m.id));
            return (
              <div
                key={index}
                className="flex flex-wrap items-center gap-1.5 rounded-xl bg-brand-100 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
              >
                <span className="opacity-70">{index + 1}.</span>
                {group.map((id) => (
                  <span key={id} className="flex items-center gap-1">
                    {firstNameOf(id)}
                    <button
                      type="button"
                      onClick={() => removeFromGroup(index, id)}
                      aria-label={`Retirer ${firstNameOf(id)}`}
                      className="text-brand-500 hover:text-brand-800 dark:hover:text-brand-200"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {eligible.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && moveIntoGroup(index, e.target.value)}
                    aria-label="Ajouter quelqu'un à ce tour"
                    className="rounded-full border border-brand-300 bg-white px-2 py-0.5 text-xs text-brand-700 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-400"
                  >
                    <option value="">+ ensemble</option>
                    {eligible.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
