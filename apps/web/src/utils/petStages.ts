export interface Stage {
  minCents: number;
  emoji: string;
  label: string;
  flavor: string;
}

// Thresholds are deliberately small (5/20/50/100/200 CHF) — a young child should see their
// companion change within a few weeks of allowance, not months, to keep saving feeling
// rewarding rather than distant.
export const STAGES: Stage[] = [
  { minCents: 0, emoji: '🥚', label: 'Œuf mystère', flavor: 'Chut… quelque chose se prépare à l’intérieur !' },
  { minCents: 500, emoji: '🐣', label: 'Bébé poussin', flavor: 'Il vient tout juste d’éclore !' },
  { minCents: 2000, emoji: '🐥', label: 'Poussin curieux', flavor: 'Il explore le monde autour de lui.' },
  { minCents: 5000, emoji: '🐤', label: 'Jeune oiseau', flavor: 'Ses ailes commencent à pousser !' },
  { minCents: 10000, emoji: '🦜', label: 'Bel oiseau', flavor: 'Il sait déjà voler un petit peu !' },
  { minCents: 20000, emoji: '🦚', label: 'Oiseau magnifique', flavor: 'Regarde ces couleurs éclatantes !' },
];

export function stageFor(balanceCents: number): { stage: Stage; index: number; next: Stage | null } {
  let index = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (balanceCents >= STAGES[i]!.minCents) index = i;
  }
  return { stage: STAGES[index]!, index, next: STAGES[index + 1] ?? null };
}
