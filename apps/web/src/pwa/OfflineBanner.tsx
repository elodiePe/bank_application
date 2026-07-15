import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-amber-500 text-center text-sm font-medium text-white"
        >
          <p className="px-4 py-2">
            Vous êtes hors ligne — les données affichées peuvent ne pas être à jour.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
