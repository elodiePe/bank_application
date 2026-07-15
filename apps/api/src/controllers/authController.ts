import type { Request, Response } from 'express';
import { loginPasswordSchema, loginPinSchema } from '@banque-familiale/shared';
import type { AuthService } from '../services/authService.js';
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE_NAME } from '../utils/cookies.js';

const FAILURE_STATUS: Record<string, number> = {
  not_found: 401,
  wrong_role: 401,
  invalid_credential: 401,
  locked: 423,
  deactivated: 403,
};

export function createAuthController(authService: AuthService) {
  return {
    async listMembers(req: Request, res: Response) {
      const members = await authService.listFamilyMembers(req.familyOwner!.familyId);
      res.json(members);
    },

    async loginPassword(req: Request, res: Response) {
      const parsed = loginPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'INVALID_INPUT' });
        return;
      }

      const result = await authService.loginWithPassword(
        parsed.data.userId,
        parsed.data.password,
        req.familyOwner!.familyId,
      );
      if (!result.ok) {
        res.status(FAILURE_STATUS[result.reason] ?? 401).json({ error: result.reason.toUpperCase() });
        return;
      }

      setAuthCookies(res, result.tokens);
      res.json(result.user);
    },

    async loginPin(req: Request, res: Response) {
      const parsed = loginPinSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'INVALID_INPUT' });
        return;
      }

      const result = await authService.loginWithPin(
        parsed.data.userId,
        parsed.data.pin,
        req.familyOwner!.familyId,
      );
      if (!result.ok) {
        res.status(FAILURE_STATUS[result.reason] ?? 401).json({ error: result.reason.toUpperCase() });
        return;
      }

      setAuthCookies(res, result.tokens);
      res.json(result.user);
    },

    async refresh(req: Request, res: Response) {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
      if (!token) {
        res.status(401).json({ error: 'UNAUTHENTICATED' });
        return;
      }

      const result = await authService.refresh(token);
      if (!result.ok) {
        clearAuthCookies(res);
        res.status(401).json({ error: result.reason.toUpperCase() });
        return;
      }

      setAuthCookies(res, result.tokens);
      res.status(204).end();
    },

    async logout(req: Request, res: Response) {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
      if (token) {
        await authService.logout(token);
      }
      clearAuthCookies(res);
      res.status(204).end();
    },

    async me(req: Request, res: Response) {
      const userId = req.auth!.sub;
      const user = await authService.getUser(userId);
      if (!user) {
        res.status(401).json({ error: 'UNAUTHENTICATED' });
        return;
      }
      res.json(user);
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
