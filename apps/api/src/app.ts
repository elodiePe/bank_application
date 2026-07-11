import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './utils/env.js';
import { healthRouter } from './routes/health.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());

  app.use('/health', healthRouter);

  return app;
}
