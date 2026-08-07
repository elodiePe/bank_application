import type { PrismaClient } from '@prisma/client';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { createNotificationService } from './notificationService.js';
import { createExportService } from './exportService.js';
import { sendEmail } from './emailService.js';
import { paymentGraceReminderTemplate, accountDeletedForNonPaymentTemplate } from '../emails/templates.js';
import { env } from '../utils/env.js';

const GRACE_PERIOD_DAYS = 30;
const REMINDER_DAYS_BEFORE_DEADLINE = 7;

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
}

/// Runs once a day (see server.ts). Never touches a family that has never had a paid
/// subscription — paymentGracePeriodStartedAt is only ever set by stripeService.syncSubscription
/// when a subscription that WAS active drops out of that state, so a family that stayed on the
/// free Essentiel plan since registration is never at risk here, no matter how long it's been.
export function createPaymentGraceService(prisma: PrismaClient) {
  const familyRepo = createFamilyRepository(prisma);
  const notificationService = createNotificationService(prisma);
  const exportService = createExportService(prisma);

  return {
    async checkGracePeriods(): Promise<{ reminded: number; deleted: number }> {
      const families = await familyRepo.listInPaymentGracePeriod();
      let reminded = 0;
      let deleted = 0;

      for (const family of families) {
        const startedAt = family.paymentGracePeriodStartedAt;
        if (!startedAt) continue; // Type narrowing only — listInPaymentGracePeriod already filters this.
        const elapsedDays = daysSince(startedAt);

        if (elapsedDays >= GRACE_PERIOD_DAYS) {
          const exportData = await exportService.exportFamilyData(family.id);
          const exportBase64 = Buffer.from(JSON.stringify(exportData, null, 2), 'utf8').toString('base64');
          const { subject, html } = accountDeletedForNonPaymentTemplate({ familyName: family.name });

          // Sent before deleting — afterwards there is no family record left to read the
          // address from, and the whole point is to confirm the deletion actually happened.
          await sendEmail({
            to: family.ownerEmail,
            subject,
            html,
            attachments: [{ filename: 'mes-donnees.json', content: exportBase64 }],
          });
          await familyRepo.delete(family.id);
          deleted++;
          continue;
        }

        if (elapsedDays >= GRACE_PERIOD_DAYS - REMINDER_DAYS_BEFORE_DEADLINE && !family.paymentGraceReminderSentAt) {
          await notificationService.notifyPaymentGraceReminder(family.id);
          const { subject, html } = paymentGraceReminderTemplate({
            familyName: family.name,
            billingUrl: `${env.webAppUrl}/settings`,
          });
          await sendEmail({ to: family.ownerEmail, subject, html });
          await familyRepo.markPaymentGraceReminderSent(family.id);
          reminded++;
        }
      }

      return { reminded, deleted };
    },
  };
}

export type PaymentGraceService = ReturnType<typeof createPaymentGraceService>;
