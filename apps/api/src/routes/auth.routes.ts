import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAuthService } from '../services/authService.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createRefreshSessionRepository } from '../repositories/refreshSessionRepository.js';
import { createAuditLogRepository } from '../repositories/auditLogRepository.js';
import { createAuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireFamilyOwner } from '../middleware/requireFamilyOwner.js';
import { loginRateLimiter } from '../middleware/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../utils/env.js';

export function createAuthRouter(prisma: PrismaClient) {
  const authService = createAuthService(
    {
      userRepository: createUserRepository(prisma),
      refreshSessionRepository: createRefreshSessionRepository(prisma),
      auditLogRepository: createAuditLogRepository(prisma),
    },
    { refreshTtlMs: env.jwtRefreshTtlSeconds * 1000 },
  );
  const controller = createAuthController(authService);

  const router = Router();

  router.get(
    '/members',
    requireFamilyOwner,
    asyncHandler((req, res) => controller.listMembers(req, res)),
  );
  router.post(
    '/login-password',
    requireFamilyOwner,
    loginRateLimiter,
    asyncHandler((req, res) => controller.loginPassword(req, res)),
  );
  router.post(
    '/login-pin',
    requireFamilyOwner,
    loginRateLimiter,
    asyncHandler((req, res) => controller.loginPin(req, res)),
  );
  router.post('/refresh', asyncHandler((req, res) => controller.refresh(req, res)));
  router.post('/logout', asyncHandler((req, res) => controller.logout(req, res)));
  router.get('/me', authenticate, asyncHandler((req, res) => controller.me(req, res)));

  return router;
}
