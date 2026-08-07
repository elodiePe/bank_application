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

/**
 * Refresh tokens are long, random, single-use (rotation + reuse detection already lives in
 * authService) — brute-forcing one is impractical. This is a second line of defense against
 * a stolen/leaked token being hammered from one source, and against the endpoint being used
 * as a cheap DoS vector. Generous limit since legitimate clients across several tabs/devices
 * can each rotate independently within the same window.
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_ATTEMPTS' },
});

/**
 * Family owner registration/login is the outermost gate and the first thing any
 * stranger who finds the URL will try to brute-force — throttle it harder than
 * per-account member login.
 */
export const familyAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_ATTEMPTS' },
});

/** Public, unauthenticated form — throttled to stop it being used to spam the contact inbox. */
export const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_ATTEMPTS' },
});
