import { createApp } from './app.js';
import { env } from './utils/env.js';
import { prisma } from './database/prismaClient.js';
import { createAllowanceService } from './services/allowanceService.js';
import { createInterestService } from './services/interestService.js';
import { createChoreService } from './services/choreService.js';
import { createMealPlanService } from './services/mealPlanService.js';

const app = createApp();
const allowanceService = createAllowanceService(prisma);
const interestService = createInterestService(prisma);
const choreService = createChoreService(prisma);
const mealPlanService = createMealPlanService(prisma);

async function runAllowanceCatchUp() {
  try {
    const payments = await allowanceService.processWeeklyAllowances();
    if (payments.length > 0) {
      console.log(
        `Argent de poche : ${payments.length} versement(s) traité(s) — ` +
          payments.map((p) => `${p.childFirstName} (${(p.amountCents / 100).toFixed(2)} CHF)`).join(', '),
      );
    }
  } catch (err) {
    console.error("Échec du traitement de l'argent de poche hebdomadaire :", err);
  }
}

async function runInterestCatchUp() {
  try {
    const payments = await interestService.processMonthlyInterest();
    if (payments.length > 0) {
      console.log(
        `Intérêts mensuels : ${payments.length} versement(s) traité(s) — ` +
          payments.map((p) => `${p.childFirstName} (${(p.amountCents / 100).toFixed(2)} CHF)`).join(', '),
      );
    }
  } catch (err) {
    console.error('Échec du traitement des intérêts mensuels :', err);
  }
}

async function runChoreReminderCheck() {
  try {
    const { choreReminders, approvalReminders } = await choreService.processReminders();
    if (choreReminders > 0 || approvalReminders > 0) {
      console.log(
        `Rappels de corvées : ${choreReminders} enfant(s) relancé(s), ${approvalReminders} validation(s) parent en attente rappelée(s).`,
      );
    }
  } catch (err) {
    console.error('Échec de la vérification des rappels de corvées :', err);
  }
}

async function runMealPlanNotificationCheck() {
  try {
    const notified = await mealPlanService.processDailyCookNotifications();
    if (notified > 0) {
      console.log(`Repas du soir : ${notified} cuisinier(s) du jour notifié(s).`);
    }
  } catch (err) {
    console.error('Échec de la notification du repas du soir :', err);
  }

  try {
    const notifiedTomorrow = await mealPlanService.processNextDayCookNotifications();
    if (notifiedTomorrow > 0) {
      console.log(`Repas du soir : ${notifiedTomorrow} cuisinier(s) de demain prévenu(s) à l'avance.`);
    }
  } catch (err) {
    console.error('Échec de la notification anticipée du repas du soir :', err);
  }
}

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  // All run immediately (catching up anything missed while the server was off), then hourly
  // so a week/month/day transition during a long-running session is picked up without a restart.
  void runAllowanceCatchUp();
  void runInterestCatchUp();
  void runChoreReminderCheck();
  void runMealPlanNotificationCheck();
  setInterval(() => void runAllowanceCatchUp(), 60 * 60 * 1000);
  setInterval(() => void runInterestCatchUp(), 60 * 60 * 1000);
  setInterval(() => void runChoreReminderCheck(), 60 * 60 * 1000);
  setInterval(() => void runMealPlanNotificationCheck(), 60 * 60 * 1000);
});
