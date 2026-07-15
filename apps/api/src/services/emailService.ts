import { Resend } from 'resend';
import { env } from '../utils/env.js';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

/**
 * Best-effort by design: a failed email must never break the caller's flow (registration,
 * password change, deletion request). Errors are logged, not thrown.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!resend) {
    // No API key configured (dev/local) — log instead of silently doing nothing, so the
    // content is still visible while building/testing the flows.
    console.log(`\n[email:dev] to=${params.to}\nsubject=${params.subject}\n${params.html}\n`);
    return;
  }

  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) {
    console.error('[email] send failed', error);
  }
}
