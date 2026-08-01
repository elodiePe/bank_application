import type { PrismaClient } from '@prisma/client';
import type { PersonalTaskSummary } from '@banque-familiale/shared';
import { createPersonalTaskRepository } from '../repositories/personalTaskRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { getStartOfDay } from '../utils/dateWeek.js';

type PersonalTaskRow = {
  id: string;
  title: string;
  recurring: boolean;
  date: Date | null;
  done: boolean;
  lastDoneDate: Date | null;
  createdAt: Date;
};

function toSummary(task: PersonalTaskRow, today: Date): PersonalTaskSummary {
  return {
    id: task.id,
    title: task.title,
    recurring: task.recurring,
    date: task.date ? task.date.toISOString().slice(0, 10) : null,
    done: task.recurring ? task.lastDoneDate?.getTime() === today.getTime() : task.done,
    createdAt: task.createdAt.toISOString(),
  };
}

export function createPersonalTaskService(prisma: PrismaClient) {
  const repo = createPersonalTaskRepository(prisma);

  async function assertOwnedByUser(id: string, userId: string) {
    const task = await repo.findById(id);
    if (!task || task.userId !== userId) throw new NotFoundError('Tâche introuvable');
    return task;
  }

  return {
    async listMine(userId: string): Promise<PersonalTaskSummary[]> {
      const today = getStartOfDay(new Date());
      const tasks = await repo.listForUser(userId);
      return tasks.map((t) => toSummary(t, today));
    },

    async create(params: {
      familyId: string;
      userId: string;
      title: string;
      recurring: boolean;
      date?: string;
    }): Promise<PersonalTaskSummary> {
      let date: Date | null = null;
      if (!params.recurring) {
        date = getStartOfDay(new Date(params.date!));
        if (Number.isNaN(date.getTime())) throw new ValidationError('Date invalide');
      }
      const task = await repo.create({
        familyId: params.familyId,
        userId: params.userId,
        title: params.title,
        recurring: params.recurring,
        date,
      });
      return toSummary(task, getStartOfDay(new Date()));
    },

    /** Toggling `done` on a recurring task sets/clears `lastDoneDate` to today (so it reflects
     * only today, resetting on its own tomorrow); on a one-off task it's a simple flag. `date`
     * postpones a one-off task to a new day — meaningless (and ignored) on a recurring one,
     * which has no calendar date to begin with. */
    async update(params: {
      id: string;
      userId: string;
      title?: string;
      done?: boolean;
      date?: string;
    }): Promise<PersonalTaskSummary> {
      const existing = await assertOwnedByUser(params.id, params.userId);
      const today = getStartOfDay(new Date());

      const data: { title?: string; done?: boolean; lastDoneDate?: Date | null; date?: Date } = {
        title: params.title,
      };
      if (params.done !== undefined) {
        if (existing.recurring) {
          data.lastDoneDate = params.done ? today : null;
        } else {
          data.done = params.done;
        }
      }
      if (params.date !== undefined && !existing.recurring) {
        const date = getStartOfDay(new Date(params.date));
        if (Number.isNaN(date.getTime())) throw new ValidationError('Date invalide');
        data.date = date;
      }

      const task = await repo.update(params.id, data);
      return toSummary(task, today);
    },

    async remove(params: { id: string; userId: string }): Promise<void> {
      await assertOwnedByUser(params.id, params.userId);
      await repo.delete(params.id);
    },
  };
}

export type PersonalTaskService = ReturnType<typeof createPersonalTaskService>;
