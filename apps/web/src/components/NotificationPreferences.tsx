import { NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORY_LABELS, type NotificationCategory } from '@banque-familiale/shared';
import { useNotificationPreferences, useUpdateNotificationPreference } from '../hooks/useNotifications.js';
import type { PushSupportState } from '../pwa/usePushSubscription.js';

function PreferenceToggle({
  category,
  enabled,
  onToggle,
  disabled,
}: {
  category: NotificationCategory;
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <span className="text-sm font-medium">{NOTIFICATION_CATEGORY_LABELS[category]}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={enabled}
        aria-label={NOTIFICATION_CATEGORY_LABELS[category]}
        className="flex shrink-0 items-center disabled:opacity-60"
      >
        <span
          className={
            enabled
              ? 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-brand-600 transition-colors dark:bg-brand-500'
              : 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-slate-300 transition-colors dark:bg-slate-600'
          }
        >
          <span
            className={
              enabled
                ? 'inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white transition-transform'
                : 'inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white transition-transform'
            }
          />
        </span>
      </button>
    </div>
  );
}

/** One toggle per notification category — visible to both parents and children (MIDDLE/TEEN;
 * YOUNG has no Paramètres page at all). Missing rows default to enabled, matching the backend's
 * "no row = on" convention.
 *
 * `pushState` comes from the single `usePushSubscription()` instance owned by SettingsPage —
 * this component must NOT call the hook itself, since a second independent instance wouldn't
 * learn about a subscription just created via PushNotificationSettings' own instance, leaving
 * these toggles stuck disabled forever after activating notifications. */
export function NotificationPreferences({ pushState }: { pushState: PushSupportState }) {
  const preferences = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();
  const pushInactive = pushState !== 'subscribed';

  const enabledByCategory = new Map(preferences.data?.map((p) => [p.category, p.enabled]));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {pushInactive
          ? "Active les notifications sur cet appareil ci-dessus pour pouvoir choisir ce que tu reçois."
          : 'Choisis les notifications que tu veux recevoir.'}
      </p>
      {NOTIFICATION_CATEGORIES.map((category) => (
        <PreferenceToggle
          key={category}
          category={category}
          enabled={!pushInactive && (enabledByCategory.get(category) ?? true)}
          disabled={pushInactive || preferences.isLoading || updatePreference.isPending}
          onToggle={() =>
            updatePreference.mutate({ category, enabled: !(enabledByCategory.get(category) ?? true) })
          }
        />
      ))}
    </div>
  );
}
