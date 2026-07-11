import type { AccessTokenPayload } from '../services/tokenService.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export {};
