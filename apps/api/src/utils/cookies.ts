import type { Response } from 'express';
import { env } from './env.js';

export const ACCESS_COOKIE_NAME = 'bf_access';
export const REFRESH_COOKIE_NAME = 'bf_refresh';

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
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
