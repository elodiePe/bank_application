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
  webOrigin: required('WEB_ORIGIN', 'http://localhost:5173'),
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
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(required('SMTP_PORT', '587')),
  smtpSecure: required('SMTP_SECURE', 'false') === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  emailFrom: required('EMAIL_FROM', 'Banque Familiale <no-reply@example.com>'),
  finnhubApiKey: process.env.FINNHUB_API_KEY,
};
