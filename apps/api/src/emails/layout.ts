export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emailButton(params: { href: string; label: string }): string {
  return `<a href="${params.href}" style="display:inline-block;margin-top:24px;padding:12px 24px;background-color:#2544e4;color:#ffffff;text-decoration:none;font-weight:600;border-radius:10px;font-size:14px;">${escapeHtml(params.label)}</a>`;
}

export function emailLayout(params: { previewText: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Banque Familiale</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f1f5f9;">${escapeHtml(params.previewText)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#2544e4;padding:24px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;">🏦 Banque Familiale</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#0f172a;font-size:14px;line-height:1.6;">
                ${params.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#64748b;">
                  Vous recevez cet e-mail car cette adresse est associée à un compte Banque Familiale.
                  Si vous n'êtes pas à l'origine de cette action, ignorez simplement ce message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
