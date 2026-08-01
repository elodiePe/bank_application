import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createPersonalTaskService, type PersonalTaskService } from './personalTaskService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

describe('personalTaskService (seeded demo family)', () => {
  let db: TestDb;
  let service: PersonalTaskService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createPersonalTaskService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('creates a one-off task for a specific date, and toggling done sets/clears a plain flag', async () => {
    const task = await service.create({
      familyId: 'demo-family',
      userId: 'demo-damien',
      title: 'Ranger le bureau',
      recurring: false,
      date: '2026-08-05',
    });
    expect(task).toMatchObject({ title: 'Ranger le bureau', recurring: false, date: '2026-08-05', done: false });

    const done = await service.update({ id: task.id, userId: 'demo-damien', done: true });
    expect(done.done).toBe(true);

    const undone = await service.update({ id: task.id, userId: 'demo-damien', done: false });
    expect(undone.done).toBe(false);
  });

  it('refuses a one-off task with no date', async () => {
    await expect(
      service.create({ familyId: 'demo-family', userId: 'demo-damien', title: 'Sans date', recurring: false }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('a recurring task only reflects "done today" — marking it done does not persist into other days', async () => {
    const task = await service.create({
      familyId: 'demo-family',
      userId: 'demo-damien',
      title: 'Faire son lit',
      recurring: true,
    });
    expect(task.done).toBe(false);
    expect(task.date).toBeNull();

    await service.update({ id: task.id, userId: 'demo-damien', done: true });

    const mine = await service.listMine('demo-damien');
    const found = mine.find((t) => t.id === task.id)!;
    expect(found.done).toBe(true);

    // Simulate the next day arriving by clearing lastDoneDate the way a new calendar day would
    // naturally make it stop matching "today" — done should read false again without another
    // explicit toggle.
    await db.prisma.personalTask.update({ where: { id: task.id }, data: { lastDoneDate: new Date('2020-01-01') } });
    const nextDay = await service.listMine('demo-damien');
    expect(nextDay.find((t) => t.id === task.id)?.done).toBe(false);
  });

  it("refuses to update or delete someone else's task", async () => {
    const task = await service.create({
      familyId: 'demo-family',
      userId: 'demo-damien',
      title: 'Tâche de Damien',
      recurring: true,
    });

    await expect(service.update({ id: task.id, userId: 'demo-elodie', done: true })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.remove({ id: task.id, userId: 'demo-elodie' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
