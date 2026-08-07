import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { PrismaClient } from '@prisma/client';
import { env } from './utils/env.js';
import { prisma as defaultPrisma } from './database/prismaClient.js';
import { healthRouter } from './routes/health.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createDashboardRouter } from './routes/dashboard.routes.js';
import { createTransactionActionsRouter } from './routes/transactionActions.routes.js';
import { createSettingsRouter } from './routes/settings.routes.js';
import { createChildAccountRouter } from './routes/childAccount.routes.js';
import { createMoneyRequestRouter } from './routes/moneyRequest.routes.js';
import { createDisputeRouter } from './routes/dispute.routes.js';
import { createNotificationRouter } from './routes/notification.routes.js';
import { createMemberRouter } from './routes/member.routes.js';
import { createFamilyAuthRouter } from './routes/familyAuth.routes.js';
import { createStockRouter } from './routes/stock.routes.js';
import { createFxRouter } from './routes/fx.routes.js';
import { createChoreRouter } from './routes/chore.routes.js';
import { createMealPlanRouter } from './routes/mealPlan.routes.js';
import { createShoppingListRouter } from './routes/shoppingList.routes.js';
import { createPointsRewardRouter } from './routes/pointsReward.routes.js';
import { createLaundryRouter } from './routes/laundry.routes.js';
import { createCustomNotificationRouter } from './routes/customNotification.routes.js';
import { createPersonalTaskRouter } from './routes/personalTask.routes.js';
import { createSavingsGoalRouter } from './routes/savingsGoal.routes.js';
import { createContactRouter } from './routes/contact.routes.js';
import { createExportRouter } from './routes/export.routes.js';
import { createBillingRouter, createBillingWebhookHandler } from './routes/billing.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(prisma: PrismaClient = defaultPrisma) {
  const app = express();

  // Render (like most hosts) puts the app behind a reverse proxy, so every request's
  // socket address is the proxy's, not the real client's. Without this, express-rate-limit
  // sees every visitor as the same IP and one family's failed attempts locks out everyone
  // else's forms too. `1` trusts exactly one hop (the platform's own proxy) and reads the
  // real client IP from X-Forwarded-For, which is what req.ip and rate-limit keying use.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin, credentials: true }));

  // Mounted before express.json(): Stripe signature verification needs the exact raw bytes
  // of the request body, which express.json() would already have parsed into an object (and
  // in doing so, invalidated for signature checking) had it run first.
  app.post('/billing/webhook', express.raw({ type: 'application/json' }), createBillingWebhookHandler(prisma));

  // Default 100kb is too small for the savings-goal photo (a resized JPEG as a base64 data
  // URL, ~33% larger than its binary size) — bumped just enough to fit that, not open-ended.
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/contact', createContactRouter());
  app.use('/family-auth', createFamilyAuthRouter(prisma));
  app.use('/auth', createAuthRouter(prisma));
  app.use('/dashboard', createDashboardRouter(prisma));
  app.use('/transactions', createTransactionActionsRouter(prisma));
  app.use('/settings', createSettingsRouter(prisma));
  app.use('/children', createChildAccountRouter(prisma));
  app.use('/money-requests', createMoneyRequestRouter(prisma));
  app.use('/disputes', createDisputeRouter(prisma));
  app.use('/notifications', createNotificationRouter(prisma));
  app.use('/members', createMemberRouter(prisma));
  app.use('/stocks', createStockRouter(prisma));
  app.use('/fx', createFxRouter());
  app.use('/chores', createChoreRouter(prisma));
  app.use('/meal-plan', createMealPlanRouter(prisma));
  app.use('/shopping-list', createShoppingListRouter(prisma));
  app.use('/points-rewards', createPointsRewardRouter(prisma));
  app.use('/laundry', createLaundryRouter(prisma));
  app.use('/custom-notifications', createCustomNotificationRouter(prisma));
  app.use('/personal-tasks', createPersonalTaskRouter(prisma));
  app.use('/savings-goal', createSavingsGoalRouter(prisma));
  app.use('/export', createExportRouter(prisma));
  app.use('/billing', createBillingRouter(prisma));

  app.use(errorHandler);

  return app;
}
