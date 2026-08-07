import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const WEAK_SECRET_PATTERNS = [/^changeme/i, /^secret$/i, /^password$/i, /^test$/i];

/** Several secrets ship with a dev-only fallback (env.ts is required to boot at all in dev
 * without a full .env) — fine locally, but a silently-accepted placeholder in production
 * would mean anyone who reads this source can forge sessions/tokens. Refuses to boot rather
 * than run with a secret that was never actually configured. */
function assertStrongSecretInProd(name: string, value: string, minLength = 32) {
  if (env.nodeEnv !== 'production') return;
  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters in production (got ${value.length}).`);
  }
  if (WEAK_SECRET_PATTERNS.some((p) => p.test(value))) {
    throw new Error(`${name} is still set to its placeholder value — set a real secret in production.`);
  }
}

export const env = {
  port: Number(required('API_PORT', '4000')),
  nodeEnv: required('NODE_ENV', 'development'),
  // Exact origin only (no path) — required for CORS, which compares scheme+host+port
  // verbatim, and would silently reject every request if a sub-path were appended here.
  webOrigin: required('WEB_ORIGIN', 'http://localhost:5173'),
  // Where the web app actually lives, including any sub-path — GitHub Pages project sites
  // are served from /<repo-name>/, not the domain root. Used to build links inside emails.
  // Falls back to webOrigin so local dev (served from the domain root) needs no extra config.
  webAppUrl: (process.env.WEB_APP_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, ''),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessTtlSeconds: Number(required('JWT_ACCESS_TTL_SECONDS', '900')),
  jwtRefreshTtlSeconds: Number(required('JWT_REFRESH_TTL_SECONDS', '2592000')),
  cookieSecure: required('COOKIE_SECURE', 'false') === 'true',
  familyOwnerSecret: required('FAMILY_OWNER_SECRET', 'changeme-family-owner'),
  // 30 days — "remember this device" so the owner isn't asked to re-login constantly.
  familyOwnerTtlSeconds: Number(required('FAMILY_OWNER_TTL_SECONDS', '2592000')),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: required('VAPID_SUBJECT', 'mailto:admin@example.com'),
  emailActionSecret: required('EMAIL_ACTION_SECRET', 'changeme-email-action'),
  // HTTP-based transactional email (Resend) — SMTP doesn't work from Render, which blocks
  // outbound connections on mail ports regardless of credentials.
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: required('EMAIL_FROM', 'FamilyApp <no-reply@example.com>'),
  // Where messages sent from the public /contact page land.
  contactEmail: required('CONTACT_EMAIL', 'informations@unmatched.ch'),
  finnhubApiKey: process.env.FINNHUB_API_KEY,
  // Billing (Stripe). Left undefined in dev until a real Stripe account exists — billing
  // routes fail fast with a clear error rather than the whole server refusing to boot, since
  // every other feature works fine without them.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  // Signs incoming webhook payloads — verified on every event so a request can only update a
  // family's subscription if it was actually sent by Stripe (see stripeService).
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePriceFamille: process.env.STRIPE_PRICE_FAMILLE,
  stripePriceGrandeFamille: process.env.STRIPE_PRICE_GRANDE_FAMILLE,
};

assertStrongSecretInProd('JWT_ACCESS_SECRET', env.jwtAccessSecret);
assertStrongSecretInProd('JWT_REFRESH_SECRET', env.jwtRefreshSecret);
assertStrongSecretInProd('FAMILY_OWNER_SECRET', env.familyOwnerSecret);
assertStrongSecretInProd('EMAIL_ACTION_SECRET', env.emailActionSecret);

if (env.nodeEnv === 'production' && !env.cookieSecure) {
  throw new Error('COOKIE_SECURE must be true in production — auth cookies would otherwise be sent over plain HTTP.');
}
