export interface PermissionValues {
  canManageMoney: boolean;
  canManageActions: boolean;
  canManageSettings: boolean;
  canManageFamily: boolean;
}

export const FULL_PERMISSIONS: PermissionValues = {
  canManageMoney: true,
  canManageActions: true,
  canManageSettings: true,
  canManageFamily: true,
};

const ITEMS: { key: keyof PermissionValues; label: string }[] = [
  { key: 'canManageMoney', label: "Gérer l'argent (dépôt, retrait, virement, correction)" },
  { key: 'canManageActions', label: 'Gérer les actions (offrir des actions, approuver les ordres)' },
  { key: 'canManageSettings', label: "Gérer les paramètres (taux d'intérêt, devise, argent de poche)" },
  { key: 'canManageFamily', label: 'Gérer la famille (ajouter des membres, réinitialiser les accès)' },
];

interface PermissionCheckboxesProps {
  value: PermissionValues;
  onChange: (value: PermissionValues) => void;
  disabled?: boolean;
}

export function PermissionCheckboxes({ value, onChange, disabled }: PermissionCheckboxesProps) {
  return (
    <div className="flex flex-col gap-2">
      {ITEMS.map((item) => (
        <label key={item.key} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={value[item.key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [item.key]: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
          />
          <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
        </label>
      ))}
    </div>
  );
}
