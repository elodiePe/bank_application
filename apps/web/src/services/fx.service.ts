import type { FxRate } from '@banque-familiale/shared';
import { apiGet } from './api.js';

export function fetchFxRate(target: string): Promise<FxRate> {
  return apiGet<FxRate>(`/fx/rate/${target}`);
}
