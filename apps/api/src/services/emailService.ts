import https from 'node:https';
import { env } from '../utils/env.js';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
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
 * Best-effort by design: a failed email must never break the caller's flow (registration,
 * password change, deletion request). Errors are logged, not thrown.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!env.resendApiKey) {
    // No API key configured (dev/local) — log instead of silently doing nothing, so the
    // content is still visible while building/testing the flows.
    console.log(`\n[email:dev] to=${params.to}\nsubject=${params.subject}\n${params.html}\n`);
    return;
  }

  try {
    const { status, body } = await postJson(
      '/emails',
      { from: env.emailFrom, to: params.to, subject: params.subject, html: params.html },
      env.resendApiKey,
    );
    if (status >= 400) {
      console.error('[email] send failed', status, body);
    }
  } catch (err) {
    console.error('[email] send failed', err);
  }
}
