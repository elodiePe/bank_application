import { useContext } from 'react';
import { ParentModeContext, type ParentModeContextValue } from '../contexts/parentMode-context.js';

/** The parent's own toggle for showing management/validation UI vs a plain consulting view.
 * Combine with an `isParent` check at each call site — a child's view never depends on this. */
export function useParentMode(): ParentModeContextValue {
  const ctx = useContext(ParentModeContext);
  if (!ctx) throw new Error('useParentMode must be used within a ParentModeProvider');
  return ctx;
}
