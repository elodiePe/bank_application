import type { Response } from 'express';
import { env } from './env.js';

export const ACCESS_COOKIE_NAME = 'bf_access';
export const REFRESH_COOKIE_NAME = 'bf_refresh';
export const FAMILY_OWNER_COOKIE_NAME = 'bf_owner';

// The frontend (GitHub Pages) and API (Render) live on different domains in production,
// making every request cross-site — SameSite=Lax blocks cookies on cross-site fetch/XHR,
// so it must be None there. None requires Secure, which is exactly when cookieSecure is
// true, so the two are derived together rather than configured separately.
const sameSite: 'lax' | 'none' = env.cookieSecure ? 'none' : 'lax';

const baseCookieOptions = {
  httpOnly: true,
  sameSite,
  secure: env.cookieSecure,
  path: '/',
};

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: env.jwtAccessTtlSeconds * 1000,
  });
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: env.jwtRefreshTtlSeconds * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
}

export function setFamilyOwnerCookie(res: Response, token: string) {
  res.cookie(FAMILY_OWNER_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: env.familyOwnerTtlSeconds * 1000,
  });
}

export function clearFamilyOwnerCookie(res: Response) {
  res.clearCookie(FAMILY_OWNER_COOKIE_NAME, baseCookieOptions);
}
