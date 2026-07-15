import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useMyNotifications,
  useUnreadNotificationCount,
} from '../hooks/useNotifications.js';
import { usePushSubscription } from '../pwa/usePushSubscription.js';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadNotificationCount();
  const notifications = useMyNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const push = usePushSubscription();

  const unreadCount = unread.data?.count ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              // Anchored to the viewport's right edge (not the bell button) so the panel
              // never gets clipped off-screen on narrow phones where the bell isn't the
              // last header item.
              className="fixed right-3 top-14 z-50 max-h-96 w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:absolute sm:right-0 sm:top-auto sm:mt-2 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead.mutate()}
                    className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              {(push.state === 'unsubscribed' || push.state === 'subscribed') && (
                <button
                  type="button"
                  onClick={() => (push.state === 'subscribed' ? push.unsubscribe() : push.subscribe())}
                  className="mb-1 w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  {push.state === 'subscribed'
                    ? '🔕 Désactiver les notifications push'
                    : '🔔 Activer les notifications push sur cet appareil'}
                </button>
              )}
              {push.state === 'denied' && (
                <p className="mb-1 px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Notifications bloquées — autorise-les dans les réglages du navigateur.
                </p>
              )}

              {notifications.data?.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucune notification.
                </p>
              )}

              <ul className="flex flex-col gap-1">
                {notifications.data?.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => !n.isRead && markAsRead.mutate(n.id)}
                    className={`cursor-pointer rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      n.isRead ? '' : 'bg-brand-50 dark:bg-brand-900/20'
                    }`}
                  >
                    <p className="font-medium">{n.title}</p>
                    <p className="text-slate-500 dark:text-slate-400">{n.body}</p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
