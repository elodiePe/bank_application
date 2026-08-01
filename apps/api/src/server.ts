import { createApp } from './app.js';
import { env } from './utils/env.js';
import { prisma } from './database/prismaClient.js';
import { createAllowanceService } from './services/allowanceService.js';
import { createInterestService } from './services/interestService.js';
import { createChoreService } from './services/choreService.js';
import { createMealPlanService } from './services/mealPlanService.js';
import { createLaundryService } from './services/laundryService.js';
import { createCustomNotificationService } from './services/customNotificationService.js';

const app = createApp();
const allowanceService = createAllowanceService(prisma);
const interestService = createInterestService(prisma);
const choreService = createChoreService(prisma);
const mealPlanService = createMealPlanService(prisma);
const laundryService = createLaundryService(prisma);
const customNotificationService = createCustomNotificationService(prisma);

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
        `Rappels de tâches : ${choreReminders} enfant(s) relancé(s), ${approvalReminders} validation(s) parent en attente rappelée(s).`,
      );
    }
  } catch (err) {
    console.error('Échec de la vérification des rappels de tâches :', err);
  }

  try {
    const eveningReminders = await choreService.processEveningReminders();
    if (eveningReminders > 0) {
      console.log(`Rappel du soir : ${eveningReminders} tâche(s) pas encore faite(s) rappelée(s).`);
    }
  } catch (err) {
    console.error('Échec du rappel du soir des tâches :', err);
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

  try {
    const chores = await mealPlanService.processDailyMealPlanChores();
    if (chores > 0) {
      console.log(`Repas du soir : ${chores} tâche(s) générée(s) pour le cuisinier du jour.`);
    }
  } catch (err) {
    console.error('Échec de la génération de tâche pour le repas du soir :', err);
  }
}

async function runLaundryNotificationCheck() {
  try {
    const notified = await laundryService.processDailyLaundryNotifications();
    if (notified > 0) {
      console.log(`Lessive : ${notified} notification(s) du jour envoyée(s).`);
    }
  } catch (err) {
    console.error('Échec de la notification de lessive :', err);
  }

  try {
    const notifiedTomorrow = await laundryService.processNextDayLaundryNotifications();
    if (notifiedTomorrow > 0) {
      console.log(`Lessive : ${notifiedTomorrow} notification(s) anticipée(s) envoyée(s).`);
    }
  } catch (err) {
    console.error('Échec de la notification anticipée de lessive :', err);
  }

  try {
    const chores = await laundryService.processDailyLaundryChores();
    if (chores > 0) {
      console.log(`Lessive : ${chores} tâche(s) générée(s).`);
    }
  } catch (err) {
    console.error('Échec de la génération de tâche pour la lessive :', err);
  }
}

async function runCustomNotificationCheck() {
  try {
    const sent = await customNotificationService.processDaily();
    if (sent > 0) {
      console.log(`Notifications personnalisées : ${sent} rappel(s) du jour envoyé(s).`);
    }
  } catch (err) {
    console.error('Échec de l\'envoi des notifications personnalisées :', err);
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
  void runLaundryNotificationCheck();
  void runCustomNotificationCheck();
  setInterval(() => void runAllowanceCatchUp(), 60 * 60 * 1000);
  setInterval(() => void runInterestCatchUp(), 60 * 60 * 1000);
  setInterval(() => void runChoreReminderCheck(), 60 * 60 * 1000);
  setInterval(() => void runMealPlanNotificationCheck(), 60 * 60 * 1000);
  setInterval(() => void runLaundryNotificationCheck(), 60 * 60 * 1000);
  // Custom notifications carry a specific time-of-day, so this one is checked far more often
  // than the others — otherwise a reminder set for 08:00 could slip by up to an hour.
  setInterval(() => void runCustomNotificationCheck(), 5 * 60 * 1000);
});
