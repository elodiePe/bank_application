import { emailButton, emailLayout, escapeHtml } from './layout.js';

export interface EmailContent {
  subject: string;
  html: string;
}

export function verifyEmailTemplate(params: { familyName: string; verifyUrl: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Confirmez votre adresse e-mail — Banque Familiale',
    html: emailLayout({
      previewText: `Confirmez l'adresse e-mail du compte ${familyName}`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Bienvenue, ${familyName} 👋</h1>
        <p style="margin:0 0 8px;">Merci d'avoir créé votre compte famille. Pour finaliser la création et confirmer que cette adresse vous appartient bien, cliquez sur le bouton ci-dessous.</p>
        ${emailButton({ href: params.verifyUrl, label: 'Confirmer mon adresse e-mail' })}
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Ce lien expire dans 3 jours. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/><span style="word-break:break-all;">${params.verifyUrl}</span></p>
      `,
    }),
  };
}

export function passwordChangedTemplate(params: { firstName: string }): EmailContent {
  const firstName = escapeHtml(params.firstName);
  const when = new Date().toLocaleString('fr-CH', { dateStyle: 'long', timeStyle: 'short' });
  return {
    subject: 'Votre mot de passe a été modifié — Banque Familiale',
    html: emailLayout({
      previewText: 'Le mot de passe de votre compte vient d\'être modifié',
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Bonjour ${firstName},</h1>
        <p style="margin:0 0 8px;">Le mot de passe de votre compte vient d'être modifié, le ${escapeHtml(when)}.</p>
        <p style="margin:16px 0 0;">Si c'est bien vous, aucune action n'est requise. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement un autre parent de la famille pour sécuriser le compte.</p>
      `,
    }),
  };
}

export function deleteAccountRequestTemplate(params: { familyName: string; confirmUrl: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Confirmez la suppression de votre compte famille — Banque Familiale',
    html: emailLayout({
      previewText: `Confirmez la suppression définitive du compte ${familyName}`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;color:#b91c1c;">⚠️ Suppression du compte "${familyName}"</h1>
        <p style="margin:0 0 8px;">Une demande de suppression définitive de votre compte famille a été effectuée.</p>
        <p style="margin:12px 0;padding:12px 16px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#7f1d1d;">
          <strong>Cette action est irréversible.</strong> Tous les membres, comptes enfants, transactions, demandes et historiques de cette famille seront définitivement supprimés.
        </p>
        <p style="margin:0 0 8px;">Si vous êtes à l'origine de cette demande, confirmez ci-dessous :</p>
        ${emailButton({ href: params.confirmUrl, label: 'Confirmer la suppression définitive' })}
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Ce lien expire dans 1 heure et vous demandera de ressaisir votre mot de passe. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — rien ne sera supprimé.</p>
      `,
    }),
  };
}

export function resetPasswordRequestTemplate(params: { familyName: string; resetUrl: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Réinitialisez votre mot de passe — Banque Familiale',
    html: emailLayout({
      previewText: `Réinitialisez le mot de passe du compte ${familyName}`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Mot de passe oublié ?</h1>
        <p style="margin:0 0 8px;">Une demande de réinitialisation du mot de passe du compte "${familyName}" a été effectuée.</p>
        <p style="margin:0 0 8px;">Si vous êtes à l'origine de cette demande, choisissez un nouveau mot de passe ci-dessous :</p>
        ${emailButton({ href: params.resetUrl, label: 'Choisir un nouveau mot de passe' })}
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre mot de passe restera inchangé.</p>
      `,
    }),
  };
}

export function resetMemberPasswordRequestTemplate(params: { firstName: string; resetUrl: string }): EmailContent {
  const firstName = escapeHtml(params.firstName);
  return {
    subject: 'Réinitialisez votre mot de passe — Banque Familiale',
    html: emailLayout({
      previewText: 'Réinitialisez votre mot de passe',
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Mot de passe oublié ?</h1>
        <p style="margin:0 0 8px;">Bonjour ${firstName}, une demande de réinitialisation de ton mot de passe a été effectuée.</p>
        <p style="margin:0 0 8px;">Si tu es à l'origine de cette demande, choisis un nouveau mot de passe ci-dessous :</p>
        ${emailButton({ href: params.resetUrl, label: 'Choisir un nouveau mot de passe' })}
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail — ton mot de passe restera inchangé.</p>
      `,
    }),
  };
}

export function accountDeletedTemplate(params: { familyName: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Votre compte famille a été supprimé — Banque Familiale',
    html: emailLayout({
      previewText: `Le compte ${familyName} a été supprimé`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Compte supprimé</h1>
        <p style="margin:0 0 8px;">Le compte famille "${familyName}" et toutes ses données ont été définitivement supprimés, comme demandé.</p>
        <p style="margin:16px 0 0;">Merci d'avoir utilisé Banque Familiale.</p>
      `,
    }),
  };
}
