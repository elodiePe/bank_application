import { useCurrentUser } from '../hooks/useAuth.js';
import { ParentDashboardPage } from './ParentDashboardPage.js';
import { ChildDashboardPage } from './ChildDashboardPage.js';

/** RequireAuth guarantees `data` is set by the time this renders. */
export function DashboardRouter() {
  const { data: user } = useCurrentUser();
  return user?.role === 'PARENT' ? <ParentDashboardPage /> : <ChildDashboardPage />;
}
