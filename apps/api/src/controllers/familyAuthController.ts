import type { Request, Response } from 'express';
import {
  confirmAccountDeletionSchema,
  confirmPasswordResetSchema,
  loginFamilySchema,
  registerFamilySchema,
  requestPasswordResetSchema,
  verifyEmailSchema,
} from '@banque-familiale/shared';
import type { FamilyAuthService } from '../services/familyAuthService.js';
import {
  setFamilyOwnerCookie,
  clearFamilyOwnerCookie,
  FAMILY_OWNER_COOKIE_NAME,
} from '../utils/cookies.js';
import { verifyFamilyOwnerToken } from '../services/tokenService.js';
import { ValidationError } from '../utils/errors.js';

const REGISTER_FAILURE_STATUS: Record<string, number> = {
  email_taken: 409,
};

const LOGIN_FAILURE_STATUS: Record<string, number> = {
  not_found: 401,
  invalid_credential: 401,
  locked: 423,
};

const VERIFY_EMAIL_FAILURE_STATUS: Record<string, number> = {
  invalid_token: 400,
  not_found: 404,
};

const CONFIRM_DELETION_FAILURE_STATUS: Record<string, number> = {
  invalid_token: 400,
  not_found: 404,
  invalid_credential: 401,
};

const CONFIRM_PASSWORD_RESET_FAILURE_STATUS: Record<string, number> = {
  invalid_token: 400,
  not_found: 404,
};

export function createFamilyAuthController(familyAuthService: FamilyAuthService) {
  return {
    async register(req: Request, res: Response) {
      const parsed = registerFamilySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'INVALID_INPUT' });
        return;
      }

      const result = await familyAuthService.registerFamily(parsed.data);
      if (!result.ok) {
        res.status(REGISTER_FAILURE_STATUS[result.reason] ?? 400).json({ error: result.reason.toUpperCase() });
        return;
      }

      setFamilyOwnerCookie(res, result.token);
      res.status(201).json({ id: result.familyId, name: result.familyName });
    },

    async login(req: Request, res: Response) {
      const parsed = loginFamilySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'INVALID_INPUT' });
        return;
      }

      const result = await familyAuthService.loginFamilyOwner(parsed.data);
      if (!result.ok) {
        res.status(LOGIN_FAILURE_STATUS[result.reason] ?? 401).json({ error: result.reason.toUpperCase() });
        return;
      }

      setFamilyOwnerCookie(res, result.token);
      res.status(200).json({ id: result.familyId, name: result.familyName });
    },

    async logout(_req: Request, res: Response) {
      clearFamilyOwnerCookie(res);
      res.status(204).end();
    },

    async me(req: Request, res: Response) {
      const token = req.cookies?.[FAMILY_OWNER_COOKIE_NAME] as string | undefined;
      const payload = token ? verifyFamilyOwnerToken(token) : null;
      if (!payload) {
        res.status(401).json({ error: 'FAMILY_OWNER_REQUIRED' });
        return;
      }

      const family = await familyAuthService.getFamily(payload.familyId);
      if (!family) {
        res.status(401).json({ error: 'FAMILY_OWNER_REQUIRED' });
        return;
      }

      res.json(family);
    },

    async verifyEmail(req: Request, res: Response) {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const result = await familyAuthService.verifyEmail(parsed.data.token);
      if (!result.ok) {
        res.status(VERIFY_EMAIL_FAILURE_STATUS[result.reason] ?? 400).json({ error: result.reason.toUpperCase() });
        return;
      }

      res.status(204).end();
    },

    async requestDeletion(req: Request, res: Response) {
      await familyAuthService.requestAccountDeletion(req.familyOwner!.familyId);
      res.status(204).end();
    },

    async confirmDeletion(req: Request, res: Response) {
      const parsed = confirmAccountDeletionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const result = await familyAuthService.confirmAccountDeletion(parsed.data);
      if (!result.ok) {
        res.status(CONFIRM_DELETION_FAILURE_STATUS[result.reason] ?? 400).json({ error: result.reason.toUpperCase() });
        return;
      }

      clearFamilyOwnerCookie(res);
      res.status(204).end();
    },

    async requestPasswordReset(req: Request, res: Response) {
      const parsed = requestPasswordResetSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await familyAuthService.requestPasswordReset(parsed.data.ownerEmail);
      res.status(204).end();
    },

    async confirmPasswordReset(req: Request, res: Response) {
      const parsed = confirmPasswordResetSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const result = await familyAuthService.confirmPasswordReset(parsed.data);
      if (!result.ok) {
        res
          .status(CONFIRM_PASSWORD_RESET_FAILURE_STATUS[result.reason] ?? 400)
          .json({ error: result.reason.toUpperCase() });
        return;
      }

      res.status(204).end();
    },
  };
}

export type FamilyAuthController = ReturnType<typeof createFamilyAuthController>;
