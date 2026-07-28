import { useNavigate } from 'react-router-dom';
import { useCurrentUser, usePermission } from '../hooks/useAuth.js';
import { useParentOverview } from '../hooks/useDashboard.js';
import { useLogoutFamily } from '../hooks/useFamilyAuth.js';
import { useTheme } from '../hooks/useTheme.js';
import { CollapsibleSection } from '../components/CollapsibleSection.js';
import { InterestRateSettings } from '../components/InterestRateSettings.js';
import { CurrencySettings } from '../components/CurrencySettings.js';
import { WeeklyAllowanceSettings } from '../components/WeeklyAllowanceSettings.js';
import { FamilyManagementPanel } from '../components/FamilyManagementPanel.js';
import { MyAccountSettings } from '../components/MyAccountSettings.js';
import { PushNotificationSettings } from '../components/PushNotificationSettings.js';
import { DeleteFamilyPanel } from '../components/DeleteFamilyPanel.js';

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const isParent = user?.role === 'PARENT';
  const overview = useParentOverview(isParent);
  const logoutFamily = useLogoutFamily();
  const canManageSettings = usePermission('canManageSettings');
  const canManageFamily = usePermission('canManageFamily');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <CollapsibleSection title="Général">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <span className="text-sm font-medium">Apparence</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
        </div>
      </CollapsibleSection>

      {isParent && canManageSettings && (
        <CollapsibleSection title="Argent">
          <InterestRateSettings />
          <CurrencySettings />
          {overview.data && <WeeklyAllowanceSettings children={overview.data.children} />}
        </CollapsibleSection>
      )}

      {isParent && canManageFamily && (
        <CollapsibleSection title="Famille">
          <FamilyManagementPanel />
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Mon compte">
        <MyAccountSettings />
        <PushNotificationSettings />
      </CollapsibleSection>

      {isParent && (
        <CollapsibleSection title="Zone sensible">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => logoutFamily.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })}
              disabled={logoutFamily.isPending}
              className="text-sm text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
            >
              Se déconnecter de ce compte famille
            </button>
          </div>
          <DeleteFamilyPanel />
        </CollapsibleSection>
      )}
    </div>
  );
}
