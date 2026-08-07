import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser, usePermission } from '../hooks/useAuth.js';
import { useParentMode } from '../hooks/useParentMode.js';
import { useParentOverview } from '../hooks/useDashboard.js';
import { useLogoutFamily } from '../hooks/useFamilyAuth.js';
import { useTheme } from '../hooks/useTheme.js';
import { usePushSubscription } from '../pwa/usePushSubscription.js';
import { CollapsibleSection } from '../components/CollapsibleSection.js';
import { InterestRateSettings } from '../components/InterestRateSettings.js';
import { CurrencySettings } from '../components/CurrencySettings.js';
import { WeeklyAllowanceSettings } from '../components/WeeklyAllowanceSettings.js';
import { FamilyManagementPanel } from '../components/FamilyManagementPanel.js';
import { FeatureFlagsSettings } from '../components/FeatureFlagsSettings.js';
import { SubscriptionSettings } from '../components/SubscriptionSettings.js';
import { ChildrenOverLimitBanner } from '../components/ChildrenOverLimitBanner.js';
import { MyAccountSettings } from '../components/MyAccountSettings.js';
import { PointsVisibilitySetting } from '../components/PointsVisibilitySetting.js';
import { PushNotificationSettings } from '../components/PushNotificationSettings.js';
import { DeleteFamilyPanel } from '../components/DeleteFamilyPanel.js';
import { CustomNotifications } from '../components/CustomNotifications.js';
import { NotificationPreferences } from '../components/NotificationPreferences.js';
import { downloadFamilyData } from '../services/export.service.js';

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const isParent = user?.role === 'PARENT';
  const overview = useParentOverview(isParent);
  const logoutFamily = useLogoutFamily();
  const canManageSettings = usePermission('canManageSettings');
  const canManageFamily = usePermission('canManageFamily');
  const { theme, toggleTheme } = useTheme();
  const isTeen = user?.interfaceLevel === 'TEEN';
  const canToggleManagementMode = isParent || isTeen;
  const { parentModeEnabled, toggleParentMode } = useParentMode();
  const push = usePushSubscription();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExportError(false);
    try {
      await downloadFamilyData();
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

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

        {canToggleManagementMode && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div>
              <span className="text-sm font-medium">Mode gestion</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isParent
                  ? 'Affiche les outils de gestion (validation, planning, famille…) au lieu d\'une vue simple utilisateur.'
                  : 'Affiche les outils pour modifier le planning des repas et du ménage.'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleParentMode}
              aria-pressed={parentModeEnabled}
              aria-label="Mode gestion"
              className="flex shrink-0 items-center"
            >
              <span
                className={
                  parentModeEnabled
                    ? 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-brand-600 transition-colors dark:bg-brand-500'
                    : 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-slate-300 transition-colors dark:bg-slate-600'
                }
              >
                <span
                  className={
                    parentModeEnabled
                      ? 'inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white transition-transform'
                      : 'inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white transition-transform'
                  }
                />
              </span>
            </button>
          </div>
        )}
        {isTeen && <PointsVisibilitySetting />}
      </CollapsibleSection>

      {isParent && canManageSettings && (
        <CollapsibleSection title="Argent">
          <InterestRateSettings />
          <CurrencySettings />
          {overview.data && <WeeklyAllowanceSettings children={overview.data.children} />}
        </CollapsibleSection>
      )}

      {isParent && canManageSettings && (
        <CollapsibleSection title="Abonnement">
          {canManageFamily && <ChildrenOverLimitBanner />}
          <SubscriptionSettings />
        </CollapsibleSection>
      )}

      {isParent && canManageSettings && (
        <CollapsibleSection title="Sections">
          <FeatureFlagsSettings />
        </CollapsibleSection>
      )}

      {isParent && canManageFamily && (
        <CollapsibleSection title="Famille">
          <FamilyManagementPanel />
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Notifications">
        <PushNotificationSettings push={push} />
        <NotificationPreferences pushState={push.state} />
        {isParent && <CustomNotifications />}
      </CollapsibleSection>

      <CollapsibleSection title="Mon compte">
        <MyAccountSettings />
      </CollapsibleSection>

      <CollapsibleSection title="Confidentialité">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consulte notre{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
              politique de confidentialité
            </Link>{' '}
            et nos{' '}
            <Link to="/terms" className="text-brand-600 hover:underline dark:text-brand-400">
              conditions générales
            </Link>
            .
          </p>
          {isParent && (
            <>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Télécharge une copie de toutes les données de ta famille (comptes, transactions, corvées,
                planning…) au format JSON.
              </p>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="mt-3 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {exporting ? 'Préparation…' : 'Télécharger mes données'}
              </button>
              {exportError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Le téléchargement a échoué. Réessaie plus tard.
                </p>
              )}
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Contact">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Une question, un problème, une suggestion ? Notre page de contact est accessible à tout moment,
            même sans être connecté.
          </p>
          <Link
            to="/contact"
            className="mt-3 inline-block rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Nous contacter
          </Link>
        </div>
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
