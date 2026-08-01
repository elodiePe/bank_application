import type { FamilyMemberDetail } from '@banque-familiale/shared';

/** Toggle chips for picking one or more people for a FIXED assignment — several people can be
 * assigned to the same day/type and do it together. */
export function MultiMemberPicker({
  members,
  selected,
  onChange,
}: {
  members: FamilyMemberDetail[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => toggle(m.id)}
          className={
            selected.includes(m.id)
              ? 'rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
              : 'rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
          }
        >
          {m.firstName}
        </button>
      ))}
    </div>
  );
}
