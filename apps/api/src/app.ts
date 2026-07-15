import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './utils/env.js';
import { prisma } from './database/prismaClient.js';
import { healthRouter } from './routes/health.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createDashboardRouter } from './routes/dashboard.routes.js';
import { createTransactionActionsRouter } from './routes/transactionActions.routes.js';
import { createSettingsRouter } from './routes/settings.routes.js';
import { createChildAccountRouter } from './routes/childAccount.routes.js';
import { createMoneyRequestRouter } from './routes/moneyRequest.routes.js';
import { createNotificationRouter } from './routes/notification.routes.js';
import { createMemberRouter } from './routes/member.routes.js';
import { createFamilyAuthRouter } from './routes/familyAuth.routes.js';
import { createStockRouter } from './routes/stock.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/family-auth', createFamilyAuthRouter(prisma));
  app.use('/auth', createAuthRouter(prisma));
  app.use('/dashboard', createDashboardRouter(prisma));
  app.use('/transactions', createTransactionActionsRouter(prisma));
  app.use('/settings', createSettingsRouter(prisma));
  app.use('/children', createChildAccountRouter(prisma));
  app.use('/money-requests', createMoneyRequestRouter(prisma));
  app.use('/notifications', createNotificationRouter(prisma));
  app.use('/members', createMemberRouter(prisma));
  app.use('/stocks', createStockRouter(prisma));

  app.use(errorHandler);

  return app;
}
