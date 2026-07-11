/**
 * Reusable CLI to import a child's transaction history from a CSV export.
 *
 * Usage:
 *   npm run import:csv -- --child Elodie --file ../../data/imports/elodie.csv
 *   npm run import:csv -- --child Elodie --file ./history.csv --force   # skip balance check
 *
 * Re-running with the same file is a no-op (rows are deduplicated by file name + line
 * number). A later file with the same historical rows plus new ones appended will only
 * import the new rows — but a file with a *different* name is imported as entirely new,
 * so make sure to reuse the exact same file name for incremental re-exports.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createUserRepository } from '../src/repositories/userRepository.js';
import { createChildAccountRepository } from '../src/repositories/childAccountRepository.js';
import {
  findBalanceInconsistency,
  importChildAccountHistory,
  parseCsvHistory,
} from '../src/services/csvImportService.js';

const DEMO_FAMILY_ID = 'demo-family';

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token?.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function formatChf(cents: number): string {
  return (cents / 100).toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const childName = args.child;
  const filePath = args.file;
  const force = args.force === true;

  if (typeof childName !== 'string' || typeof filePath !== 'string') {
    console.error('Usage: import:csv -- --child <prénom> --file <chemin.csv> [--force]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const userRepository = createUserRepository(prisma);
    const childAccountRepository = createChildAccountRepository(prisma);

    const members = await userRepository.listFamilyMembers(DEMO_FAMILY_ID);
    const child = members.find(
      (m) => m.role === 'CHILD' && m.firstName.toLowerCase() === childName.toLowerCase(),
    );
    if (!child) {
      console.error(`Aucun enfant nommé "${childName}" trouvé dans la famille de démo.`);
      process.exit(1);
    }

    const account = await childAccountRepository.findByUserId(child.id);
    if (!account) {
      console.error(`${childName} n'a pas de compte enfant.`);
      process.exit(1);
    }

    const absolutePath = path.resolve(process.cwd(), filePath);
    const content = readFileSync(absolutePath, 'utf-8');
    const rows = parseCsvHistory(content);

    const inconsistency = findBalanceInconsistency(rows);
    if (inconsistency && !force) {
      console.error(`Incohérence détectée dans le fichier — import annulé.\n${inconsistency}`);
      console.error('Relancez avec --force pour importer malgré tout.');
      process.exit(1);
    }

    const summary = await importChildAccountHistory(prisma, {
      accountId: account.id,
      sourceFileName: path.basename(absolutePath),
      rows,
    });

    console.log(`Import terminé pour ${child.firstName} :`);
    console.log(`  Lignes lues        : ${summary.totalRows}`);
    console.log(`  Transactions créées: ${summary.imported}`);
    console.log(`  Doublons ignorés   : ${summary.skippedDuplicates}`);
    console.log(`  Solde avant import : ${formatChf(summary.startingBalanceCents)} CHF`);
    console.log(`  Solde final        : ${formatChf(summary.finalBalanceCents)} CHF`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
