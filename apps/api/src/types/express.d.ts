import type { AccessTokenPayload, FamilyOwnerPayload } from '../services/tokenService.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
      familyOwner?: FamilyOwnerPayload;
    }
  }
}

export {};
