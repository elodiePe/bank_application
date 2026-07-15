import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createFamilyAuthService } from '../services/familyAuthService.js';
import { createFamilyAuthController } from '../controllers/familyAuthController.js';
import { familyAuthRateLimiter } from '../middleware/rateLimiters.js';
import { requireFamilyOwner } from '../middleware/requireFamilyOwner.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createFamilyAuthRouter(prisma: PrismaClient) {
  const familyAuthService = createFamilyAuthService(prisma);
  const controller = createFamilyAuthController(familyAuthService);

  const router = Router();

  router.post(
    '/register',
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.register(req, res)),
  );
  router.post(
    '/login',
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.login(req, res)),
  );
  router.post('/logout', asyncHandler((req, res) => controller.logout(req, res)));
  router.get('/me', asyncHandler((req, res) => controller.me(req, res)));
  router.post(
    '/verify-email',
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.verifyEmail(req, res)),
  );
  router.post(
    '/request-deletion',
    familyAuthRateLimiter,
    requireFamilyOwner,
    asyncHandler((req, res) => controller.requestDeletion(req, res)),
  );
  router.post(
    '/confirm-deletion',
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.confirmDeletion(req, res)),
  );
  router.post(
    '/request-password-reset',
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.requestPasswordReset(req, res)),
  );
  router.post(
    '/confirm-password-reset',
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.confirmPasswordReset(req, res)),
  );

  return router;
}
