import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Tab {
  label: string;
  content: React.ReactNode;
  badge?: number;
}

interface SwipeTabsProps {
  tabs: Tab[];
  active?: number;
  onActiveChange?: (index: number) => void;
}

const SWIPE_THRESHOLD = 60;

export function SwipeTabs({ tabs, active: controlledActive, onActiveChange }: SwipeTabsProps) {
  const [internalActive, setInternalActive] = useState(0);
  const active = controlledActive ?? internalActive;

  function setActive(index: number) {
    if (onActiveChange) onActiveChange(index);
    else setInternalActive(index);
  }

  return (
    <div>
      <div
        className="mb-6 grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(index)}
            className={
              active === index
                ? 'relative rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm dark:bg-slate-950'
                : 'relative rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400'
            }
          >
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_THRESHOLD && active < tabs.length - 1) setActive(active + 1);
            else if (info.offset.x > SWIPE_THRESHOLD && active > 0) setActive(active - 1);
          }}
        >
          {tabs[active]?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
