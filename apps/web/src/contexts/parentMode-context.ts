import { createContext } from 'react';

export interface ParentModeContextValue {
  parentModeEnabled: boolean;
  toggleParentMode: () => void;
}

export const ParentModeContext = createContext<ParentModeContextValue | null>(null);
