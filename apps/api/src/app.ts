import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './utils/env.js';
import { prisma } from './database/prismaClient.js';
import { healthRouter } from './routes/health.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/auth', createAuthRouter(prisma));

  return app;
}
