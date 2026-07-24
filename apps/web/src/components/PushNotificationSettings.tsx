import { usePushSubscription } from '../pwa/usePushSubscription.js';

export function PushNotificationSettings() {
  const push = usePushSubscription();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-medium">Notifications push</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Reçois une notification sur cet appareil pour les demandes, dépôts et autres opérations —
        même quand l'application est fermée.
      </p>

      <div className="mt-3">
        {(push.state === 'unsubscribed' || push.state === 'subscribed') && (
          <button
            type="button"
            onClick={() => (push.state === 'subscribed' ? push.unsubscribe() : push.subscribe())}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              push.state === 'subscribed'
                ? 'border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {push.state === 'subscribed' ? '🔕 Désactiver sur cet appareil' : '🔔 Activer sur cet appareil'}
          </button>
        )}
        {push.state === 'denied' && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Notifications bloquées — autorise-les dans les réglages du navigateur pour ce site.
          </p>
        )}
        {push.state === 'unsupported' && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Ton navigateur ne supporte pas les notifications push.
          </p>
        )}
        {push.state === 'checking' && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Vérification…</p>
        )}
      </div>
    </div>
  );
}
