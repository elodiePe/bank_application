import { useEffect, useState, type ReactNode } from 'react';
import { ParentModeContext } from './parentMode-context.js';

const STORAGE_KEY = 'banque-familiale-parent-mode';

function getInitialParentMode(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  // Defaults to on — nothing changes until a parent explicitly switches to plain-user view.
  return stored !== 'off';
}

export function ParentModeProvider({ children }: { children: ReactNode }) {
  const [parentModeEnabled, setParentModeEnabled] = useState<boolean>(getInitialParentMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, parentModeEnabled ? 'on' : 'off');
  }, [parentModeEnabled]);

  const toggleParentMode = () => setParentModeEnabled((current) => !current);

  return (
    <ParentModeContext.Provider value={{ parentModeEnabled, toggleParentMode }}>
      {children}
    </ParentModeContext.Provider>
  );
}
