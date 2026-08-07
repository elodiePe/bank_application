import https from 'node:https';
import { env } from '../utils/env.js';

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file content — Resend's own attachment format. */
  content: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

const RESEND_HOST = 'api.resend.com';

/**
 * Posts to Resend over the `https` module with an explicit IPv4 socket, not the Resend SDK
 * (which uses Node's global `fetch`/undici). On networks where a host has real IPv6 records
 * but no working IPv6 route, `fetch()` hangs until its connect timeout instead of falling back
 * to IPv4 — the same class of bug already fixed for fxService and stockPriceService.
 */
function postJson(path: string, body: unknown, apiKey: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: RESEND_HOST,
        path,
        method: 'POST',
        family: 4,
        timeout: 10_000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let responseBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (responseBody += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: responseBody }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('Resend request timed out')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Throws on failure — for the rare caller where email delivery isn't a side effect of some
 * other already-completed action, but the entire point of the request (e.g. the public
 * contact form: there's nothing to "succeed" other than the message actually being sent).
 */
export async function sendEmailStrict(params: SendEmailParams): Promise<void> {
  if (!env.resendApiKey) {
    const attachmentNote = params.attachments?.length
      ? ` [+${params.attachments.length} attachment(s): ${params.attachments.map((a) => a.filename).join(', ')}]`
      : '';
    console.log(`\n[email:dev] to=${params.to}\nsubject=${params.subject}${attachmentNote}\n${params.html}\n`);
    return;
  }

  const { status, body } = await postJson(
    '/emails',
    {
      from: env.emailFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    },
    env.resendApiKey,
  );
  if (status >= 400) {
    throw new Error(`Resend responded with status ${status}: ${body}`);
  }
}

/**
 * Best-effort by design: a failed email must never break the caller's flow (registration,
 * password change, deletion request). Errors are logged, not thrown.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    await sendEmailStrict(params);
  } catch (err) {
    console.error('[email] send failed', err);
  }
}
