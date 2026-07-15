import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useParentOverview } from '../hooks/useDashboard.js';
import { useLogoutFamily } from '../hooks/useFamilyAuth.js';
import { InterestRateSettings } from '../components/InterestRateSettings.js';
import { CurrencySettings } from '../components/CurrencySettings.js';
import { WeeklyAllowanceSettings } from '../components/WeeklyAllowanceSettings.js';
import { FamilyManagementPanel } from '../components/FamilyManagementPanel.js';
import { MyAccountSettings } from '../components/MyAccountSettings.js';
import { DeleteFamilyPanel } from '../components/DeleteFamilyPanel.js';

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const isParent = user?.role === 'PARENT';
  const overview = useParentOverview(isParent);
  const logoutFamily = useLogoutFamily();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <div className="space-y-3">
        {isParent && <InterestRateSettings />}
        {isParent && <CurrencySettings />}
        {isParent && overview.data && <WeeklyAllowanceSettings children={overview.data.children} />}
        {isParent && <FamilyManagementPanel />}
        <MyAccountSettings />

        {isParent && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => logoutFamily.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })}
              disabled={logoutFamily.isPending}
              className="text-sm text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
            >
              Se déconnecter de ce compte famille
            </button>
          </div>
        )}

        {isParent && <DeleteFamilyPanel />}
      </div>
    </div>
  );
}
