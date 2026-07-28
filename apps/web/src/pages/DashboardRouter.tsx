import { useCurrentUser } from '../hooks/useAuth.js';
import { ChildDashboardYoung } from './ChildDashboardYoung.js';
import { MoneyPage } from './MoneyPage.js';

/** RequireAuth guarantees `data` is set by the time this renders. `/dashboard` is the
 * "Argent" section for everyone except a YOUNG child, who gets their own single page
 * covering everything (money, requests, chores) at once. */
export function DashboardRouter() {
  const { data: user } = useCurrentUser();
  if (user?.interfaceLevel === 'YOUNG') return <ChildDashboardYoung />;
  return <MoneyPage />;
}
