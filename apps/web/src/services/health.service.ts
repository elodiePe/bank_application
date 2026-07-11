import type { HealthStatus } from '@banque-familiale/shared';
import { apiGet } from './api.js';

export function fetchHealth(): Promise<HealthStatus> {
  return apiGet<HealthStatus>('/health');
}
