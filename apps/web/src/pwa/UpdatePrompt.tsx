import { AnimatePresence, motion } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Missed weekly-allowance/interest catch-up runs happen server-side on restart;
      // this just keeps the installed app shell current.
      registration?.update();
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-1/2 z-50 flex w-[92%] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-800"
        >
          <span>
            {needRefresh
              ? 'Une nouvelle version est disponible.'
              : "Ceci est la dernière version de l'application."}
          </span>
          <div className="flex shrink-0 gap-2">
            {needRefresh && (
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="rounded-lg bg-brand-600 px-3 py-1 font-medium hover:bg-brand-500"
              >
                Mettre à jour
              </button>
            )}
            <button type="button" onClick={close} className="rounded-lg px-2 py-1 text-slate-300 hover:text-white">
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
