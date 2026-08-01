import { useEffect, useState } from 'react';

function storageKey(userId: string): string {
  return `visit-streak:${userId}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface StreakRecord {
  lastVisitDate: string;
  streakDays: number;
}

/** Consecutive-day visit streak — device-local (localStorage), not a server concept. Visiting
 * again the same day doesn't change it; visiting the day right after extends it by one;
 * skipping a day (or more) resets it to 1. Simple, honest gamification hook: it rewards
 * showing up regularly without needing any backend tracking. */
export function useVisitStreak(userId: string | undefined) {
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const key = storageKey(userId);
    let record: StreakRecord | null = null;
    try {
      const raw = localStorage.getItem(key);
      record = raw ? (JSON.parse(raw) as StreakRecord) : null;
    } catch {
      record = null;
    }

    const today = todayIso();
    let next: StreakRecord;
    if (record?.lastVisitDate === today) {
      next = record;
    } else if (record?.lastVisitDate === yesterdayIso()) {
      next = { lastVisitDate: today, streakDays: record.streakDays + 1 };
    } else {
      next = { lastVisitDate: today, streakDays: 1 };
    }

    setStreakDays(next.streakDays);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Streak tracking is a nice-to-have — never worth breaking the UI over.
    }
  }, [userId]);

  return streakDays;
}
