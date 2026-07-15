import { createApp } from './app.js';
import { env } from './utils/env.js';
import { prisma } from './database/prismaClient.js';
import { createAllowanceService } from './services/allowanceService.js';
import { createInterestService } from './services/interestService.js';

const app = createApp();
const allowanceService = createAllowanceService(prisma);
const interestService = createInterestService(prisma);

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

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  // Both run immediately (catching up anything missed while the server was off), then hourly
  // so a week/month transition during a long-running session is picked up without a restart.
  void runAllowanceCatchUp();
  void runInterestCatchUp();
  setInterval(() => void runAllowanceCatchUp(), 60 * 60 * 1000);
  setInterval(() => void runInterestCatchUp(), 60 * 60 * 1000);
});
