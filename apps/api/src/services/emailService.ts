import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../utils/env.js';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const transporter: Transporter | null = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
    })
  : null;

/**
 * Best-effort by design: a failed email must never break the caller's flow (registration,
 * password change, deletion request). Errors are logged, not thrown.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!transporter) {
    // No SMTP configured (dev/local) — log instead of silently doing nothing, so the
    // content is still visible while building/testing the flows.
    console.log(`\n[email:dev] to=${params.to}\nsubject=${params.subject}\n${params.html}\n`);
    return;
  }

  try {
    await transporter.sendMail({
      from: env.emailFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    console.error('[email] send failed', err);
  }
}
