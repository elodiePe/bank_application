import rateLimit from 'express-rate-limit';

/**
 * Coarse per-IP throttle on login attempts. The real brute-force defense against a
 * 4-digit PIN is the per-account lockout in authService; this just slows down
 * broad scanning from a single source.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_ATTEMPTS' },
});
