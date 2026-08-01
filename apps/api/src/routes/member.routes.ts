import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createMemberService } from '../services/memberService.js';
import { createMemberController } from '../controllers/memberController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireFamilyOwner } from '../middleware/requireFamilyOwner.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRequirePermission } from '../middleware/requirePermission.js';
import { createRequireParentOrTeen } from '../middleware/requireParentOrTeen.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { familyAuthRateLimiter } from '../middleware/rateLimiters.js';

export function createMemberRouter(prisma: PrismaClient) {
  const memberService = createMemberService(prisma);
  const controller = createMemberController(memberService);
  const requirePermission = createRequirePermission(prisma);
  const requireParentOrTeen = createRequireParentOrTeen(prisma);

  const router = Router();

  // Bootstrap: creates the very first parent for a freshly registered, still-empty
  // family. Guarded by the family-owner session, not member auth — there is no member
  // to authenticate as yet. memberService.createFirstParent rejects once any member exists.
  router.post(
    '/bootstrap-parent',
    requireFamilyOwner,
    asyncHandler((req, res) => controller.bootstrapParent(req, res)),
  );

  // Forgot-credential flow, reachable from the member picker before any member session
  // exists — gated by the family-owner session instead. A parent gets an emailed reset
  // link (own account, own inbox); a child has no email, so their parents get notified
  // and reset the PIN in person via the existing parent-authenticated /:id/reset-pin.
  router.post(
    '/:id/request-pin-reset',
    requireFamilyOwner,
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.requestPinReset(req, res)),
  );
  router.post(
    '/:id/request-pin-reset-notification',
    requireFamilyOwner,
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.requestPinResetNotification(req, res)),
  );
  // Public: reached from the emailed link itself, so there is no session of any kind yet.
  router.post(
    '/pin-reset/confirm',
    familyAuthRateLimiter,
    asyncHandler((req, res) => controller.confirmPinReset(req, res)),
  );

  router.use(authenticate);

  // Self-service credential change — available to both parents and children (they only
  // ever have a PIN to change; the service rejects if the caller has no PIN configured).
  router.post('/me/change-pin', asyncHandler((req, res) => controller.changeOwnPin(req, res)));
  router.post(
    '/me/points-visibility',
    asyncHandler((req, res) => controller.setShowPointsBalance(req, res)),
  );

  // Trimmed-down roster (no email, no permission booleans) for the meal-plan/laundry member
  // pickers — a parent or a TEEN-interface child can reach it, unlike the full listing below.
  router.get(
    '/roster',
    requireParentOrTeen,
    asyncHandler((req, res) => controller.listHouseholdRoster(req, res)),
  );

  const parentRouter = Router();
  parentRouter.use(requireRole('PARENT'));
  parentRouter.get('/', asyncHandler((req, res) => controller.listMembers(req, res)));
  parentRouter.post('/me/email', asyncHandler((req, res) => controller.setOwnEmail(req, res)));
  parentRouter.post(
    '/',
    requirePermission('canManageFamily'),
    asyncHandler((req, res) => controller.addMember(req, res)),
  );
  parentRouter.post(
    '/:id/reset-pin',
    requirePermission('canManageFamily'),
    asyncHandler((req, res) => controller.resetPin(req, res)),
  );
  parentRouter.post(
    '/:id/deactivate',
    requirePermission('canManageFamily'),
    asyncHandler((req, res) => controller.deactivateMember(req, res)),
  );
  // Admin-only (checked in the service, since it's a meta-permission distinct from the
  // four booleans below it governs): change what a non-admin parent is allowed to do.
  parentRouter.patch(
    '/:id/permissions',
    asyncHandler((req, res) => controller.updatePermissions(req, res)),
  );
  parentRouter.patch(
    '/:id/interface-level',
    requirePermission('canManageFamily'),
    asyncHandler((req, res) => controller.setChildInterfaceLevel(req, res)),
  );

  router.use(parentRouter);

  return router;
}
