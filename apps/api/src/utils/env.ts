import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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
  emailFrom: required('EMAIL_FROM', 'Banque Familiale <no-reply@example.com>'),
  finnhubApiKey: process.env.FINNHUB_API_KEY,
};
