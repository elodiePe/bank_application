import { emailButton, emailLayout, escapeHtml } from './layout.js';

export interface EmailContent {
  subject: string;
  html: string;
}

export function verifyEmailTemplate(params: { familyName: string; verifyUrl: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Confirmez votre adresse e-mail — FamilyApp',
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

export function ownerMfaCodeTemplate(params: { familyName: string; code: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: `${params.code} — votre code de connexion FamilyApp`,
    html: emailLayout({
      previewText: `Votre code de connexion : ${params.code}`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Code de connexion</h1>
        <p style="margin:0 0 8px;">Bonjour ${familyName}, voici le code à saisir pour terminer la connexion :</p>
        <p style="margin:16px 0;font-size:28px;font-weight:700;letter-spacing:4px;text-align:center;">${params.code}</p>
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette tentative de connexion, ignorez cet e-mail — sans ce code, personne ne peut accéder à votre compte.</p>
      `,
    }),
  };
}

export function contactMessageTemplate(params: { name?: string; email: string; message: string }): EmailContent {
  const name = params.name ? escapeHtml(params.name) : null;
  const email = escapeHtml(params.email);
  // Line breaks are the only formatting a plain-text message can carry — converted to <br/>
  // after escaping, so nothing in the message body can inject markup.
  const messageHtml = escapeHtml(params.message).replace(/\n/g, '<br/>');
  return {
    subject: `Nouveau message de contact${name ? ` — ${name}` : ''}`,
    html: emailLayout({
      previewText: `Message de contact de ${name ?? email}`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Nouveau message depuis la page de contact</h1>
        <p style="margin:0 0 4px;"><strong>De :</strong> ${name ? `${name} — ` : ''}${email}</p>
        <p style="margin:16px 0 0;white-space:pre-wrap;">${messageHtml}</p>
      `,
    }),
  };
}

export function contactConfirmationTemplate(params: { name?: string; message: string }): EmailContent {
  const greeting = params.name ? escapeHtml(params.name) : 'là';
  const messageHtml = escapeHtml(params.message).replace(/\n/g, '<br/>');
  return {
    subject: 'Ton message a bien été reçu — FamilyApp',
    html: emailLayout({
      previewText: 'On te répond dès que possible',
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Salut ${greeting} 👋</h1>
        <p style="margin:0 0 8px;">Merci pour ton message, on te répond dès que possible.</p>
        <p style="margin:16px 0 4px;font-size:12px;color:#64748b;">Pour rappel, voici ce que tu nous as envoyé :</p>
        <p style="margin:0;padding:12px;background:#f1f5f9;border-radius:8px;white-space:pre-wrap;">${messageHtml}</p>
      `,
    }),
  };
}

export function passwordChangedTemplate(params: { firstName: string }): EmailContent {
  const firstName = escapeHtml(params.firstName);
  const when = new Date().toLocaleString('fr-CH', { dateStyle: 'long', timeStyle: 'short' });
  return {
    subject: 'Votre mot de passe a été modifié — FamilyApp',
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
    subject: 'Confirmez la fermeture de votre compte famille — FamilyApp',
    html: emailLayout({
      previewText: `Confirmez la fermeture du compte ${familyName}`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Fermeture du compte "${familyName}"</h1>
        <p style="margin:0 0 8px;">Une demande de fermeture de votre compte famille a été effectuée.</p>
        <p style="margin:0 0 8px;">Cette action ne peut pas être annulée par la suite : les membres, comptes enfants, transactions, demandes et historiques de cette famille seront supprimés.</p>
        <p style="margin:0 0 8px;">Si vous êtes à l'origine de cette demande, confirmez ci-dessous :</p>
        ${emailButton({ href: params.confirmUrl, label: 'Confirmer la fermeture du compte' })}
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Ce lien expire dans 1 heure et vous demandera de ressaisir votre mot de passe. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
      `,
    }),
  };
}

export function resetPasswordRequestTemplate(params: { familyName: string; resetUrl: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Réinitialisez votre mot de passe — FamilyApp',
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

export function resetMemberPinRequestTemplate(params: { firstName: string; resetUrl: string }): EmailContent {
  const firstName = escapeHtml(params.firstName);
  return {
    subject: 'Réinitialisez votre code PIN — FamilyApp',
    html: emailLayout({
      previewText: 'Réinitialisez votre code PIN',
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Code PIN oublié ?</h1>
        <p style="margin:0 0 8px;">Bonjour ${firstName}, une demande de réinitialisation de ton code PIN a été effectuée.</p>
        <p style="margin:0 0 8px;">Si tu es à l'origine de cette demande, choisis un nouveau code PIN ci-dessous :</p>
        ${emailButton({ href: params.resetUrl, label: 'Choisir un nouveau code PIN' })}
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail — ton code PIN restera inchangé.</p>
      `,
    }),
  };
}

export function pinChangedTemplate(params: { firstName: string }): EmailContent {
  const firstName = escapeHtml(params.firstName);
  const when = new Date().toLocaleString('fr-CH', { dateStyle: 'long', timeStyle: 'short' });
  return {
    subject: 'Votre code PIN a été modifié — FamilyApp',
    html: emailLayout({
      previewText: 'Le code PIN de votre compte vient d\'être modifié',
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Bonjour ${firstName},</h1>
        <p style="margin:0 0 8px;">Le code PIN de votre compte vient d'être modifié, le ${escapeHtml(when)}.</p>
        <p style="margin:16px 0 0;">Si c'est bien vous, aucune action n'est requise. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement un autre parent de la famille pour sécuriser le compte.</p>
      `,
    }),
  };
}

export function accountDeletedTemplate(params: { familyName: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Votre compte famille a été supprimé — FamilyApp',
    html: emailLayout({
      previewText: `Le compte ${familyName} a été supprimé`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Compte supprimé</h1>
        <p style="margin:0 0 8px;">Le compte famille "${familyName}" et toutes ses données ont été définitivement supprimés, comme demandé.</p>
        <p style="margin:16px 0 0;">Merci d'avoir utilisé FamilyApp.</p>
      `,
    }),
  };
}

export function paymentPastDueTemplate(params: { familyName: string; billingUrl: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Paiement en attente sur votre abonnement — FamilyApp',
    html: emailLayout({
      previewText: `Le paiement de l'abonnement de ${familyName} est en attente`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Paiement en attente</h1>
        <p style="margin:0 0 8px;">Le paiement de l'abonnement de la famille "${familyName}" n'a pas pu être effectué.</p>
        <p style="margin:0 0 8px;">Vous avez <strong>30 jours</strong> pour régulariser le paiement ou changer de plan d'abonnement (y compris repasser au plan gratuit Essentiel). Passé ce délai, le compte et tout son historique (transactions, corvées, planning…) seront définitivement supprimés.</p>
        ${emailButton({ href: params.billingUrl, label: 'Gérer mon abonnement' })}
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">En attendant, votre famille garde l'accès à tout ce qu'elle a déjà — seules les nouvelles actions liées à l'abonnement sont mises en pause.</p>
      `,
    }),
  };
}

export function paymentGraceReminderTemplate(params: { familyName: string; billingUrl: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Plus que 7 jours avant la suppression de votre compte — FamilyApp',
    html: emailLayout({
      previewText: `Le compte ${familyName} sera supprimé dans 7 jours sans action`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Dernier rappel — 7 jours restants</h1>
        <p style="margin:0 0 8px;">Le paiement de l'abonnement de la famille "${familyName}" est toujours en attente.</p>
        <p style="margin:0 0 8px;">Sans régularisation ou changement de plan dans les <strong>7 prochains jours</strong>, le compte et tout son historique seront définitivement supprimés.</p>
        ${emailButton({ href: params.billingUrl, label: 'Gérer mon abonnement' })}
      `,
    }),
  };
}

export function accountDeletedForNonPaymentTemplate(params: { familyName: string }): EmailContent {
  const familyName = escapeHtml(params.familyName);
  return {
    subject: 'Votre compte famille a été supprimé pour non-paiement — FamilyApp',
    html: emailLayout({
      previewText: `Le compte ${familyName} a été supprimé après 30 jours de paiement en attente`,
      bodyHtml: `
        <h1 style="margin:0 0 12px;font-size:18px;">Compte supprimé</h1>
        <p style="margin:0 0 8px;">Le paiement de l'abonnement de la famille "${familyName}" est resté en attente pendant 30 jours sans être régularisé. Conformément à l'avertissement envoyé, le compte et toutes ses données ont été définitivement supprimés.</p>
        <p style="margin:0 0 8px;">Une copie de toutes vos données (comptes, transactions, corvées, planning…) au format JSON est jointe à cet e-mail.</p>
        <p style="margin:16px 0 0;">Si vous souhaitez recréer un compte, vous pouvez le faire à tout moment depuis notre page d'accueil.</p>
      `,
    }),
  };
}
