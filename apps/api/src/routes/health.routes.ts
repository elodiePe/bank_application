import { Router } from 'express';
import type { HealthStatus } from '@banque-familiale/shared';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const body: HealthStatus = { status: 'ok', timestamp: new Date().toISOString() };
  res.json(body);
});
