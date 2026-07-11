import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAuthService } from '../services/authService.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createRefreshSessionRepository } from '../repositories/refreshSessionRepository.js';
import { createAuditLogRepository } from '../repositories/auditLogRepository.js';
import { createAuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginRateLimiter } from '../middleware/rateLimiters.js';
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

  router.get('/members', (req, res) => controller.listMembers(req, res));
  router.post('/login-password', loginRateLimiter, (req, res) => controller.loginPassword(req, res));
  router.post('/login-pin', loginRateLimiter, (req, res) => controller.loginPin(req, res));
  router.post('/refresh', (req, res) => controller.refresh(req, res));
  router.post('/logout', (req, res) => controller.logout(req, res));
  router.get('/me', authenticate, (req, res) => controller.me(req, res));

  return router;
}
