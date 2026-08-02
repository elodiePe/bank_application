import { useSettings, useUpdateFeatureFlags } from '../hooks/useTransactionActions.js';
import { FEATURE_TOGGLES, type FeatureFlags } from '../utils/featureFlags.js';

/** Lets a parent turn optional sections (Actions, Repas, Courses, Ménage) on or off after the
 * fact — the same 4 toggles offered once during onboarding, now reachable at any time. Turning
 * a section off only hides it (sub-tabs, shortcuts); nothing it already contains is deleted. */
export function FeatureFlagsSettings() {
  const settings = useSettings();
  const updateFeatureFlags = useUpdateFeatureFlags();

  if (!settings.data) return null;

  function toggle(key: keyof FeatureFlags) {
    updateFeatureFlags.mutate({ [key]: !settings.data![key] });
  }

  return (
    <div className="flex flex-col gap-2">
      {FEATURE_TOGGLES.map((toggleDef) => {
        const isOn = settings.data![toggleDef.key];
        return (
          <button
            key={toggleDef.key}
            type="button"
            onClick={() => toggle(toggleDef.key)}
            disabled={updateFeatureFlags.isPending}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
              isOn
                ? 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <span aria-hidden className="text-xl">{toggleDef.icon}</span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{toggleDef.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{toggleDef.description}</span>
            </span>
            <span
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${isOn ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span
                className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
