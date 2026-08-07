import type { ContactMessageInput } from '@banque-familiale/shared';
import { sendEmail, sendEmailStrict } from './emailService.js';
import { contactConfirmationTemplate, contactMessageTemplate } from '../emails/templates.js';
import { env } from '../utils/env.js';
import { ExternalServiceError } from '../utils/errors.js';

export function createContactService() {
  return {
    async send(input: ContactMessageInput): Promise<void> {
      // Unlike most email sends in this app, there's no other side effect to fall back on for
      // *this* one — delivering the message to us *is* the whole point of the request, so a
      // failure here must be reported to the sender instead of silently swallowed (see
      // sendEmailStrict).
      const toUs = contactMessageTemplate(input);
      try {
        await sendEmailStrict({ to: env.contactEmail, subject: toUs.subject, html: toUs.html });
      } catch (err) {
        console.error('[contact] send failed', err);
        throw new ExternalServiceError("Impossible d'envoyer le message pour le moment. Réessaie plus tard.");
      }

      // The confirmation copy back to the sender is a courtesy on top of an already-delivered
      // message — best-effort (see sendEmail), so a flaky send here doesn't turn an otherwise
      // successful submission into an error for the sender.
      const toSender = contactConfirmationTemplate(input);
      void sendEmail({ to: input.email, subject: toSender.subject, html: toSender.html });
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;
