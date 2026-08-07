import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiTestContext, loginAsMember, type ApiTestContext } from '../test-utils/apiTestContext.js';

describe('choreController (integration, seeded demo family)', () => {
  let ctx: ApiTestContext;

  beforeAll(async () => {
    ctx = await createApiTestContext();
    await loginAsMember(ctx.agent, 'demo-papa', '1111');
  });

  afterAll(() => ctx.db.teardown());

  it('rejects invalid input on create', async () => {
    const res = await ctx.agent.post('/chores').send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('creates a chore, then lists it via GET /chores (exercises the batched current-period lookup route end-to-end)', async () => {
    const createRes = await ctx.agent.post('/chores').send({
      childUserId: 'demo-damien',
      title: 'Ranger ses jouets',
      rewardType: 'MONEY',
      rewardCents: 25,
      recurrence: 'DAILY',
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ title: 'Ranger ses jouets', currentPeriodStatus: null });

    const listRes = await ctx.agent.get('/chores');
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((c: { id: string }) => c.id === createRes.body.id)).toBe(true);
  });

  it('refuses a parent-only route to a child', async () => {
    await loginAsMember(ctx.agent, 'demo-damien', '5555');
    const res = await ctx.agent.get('/chores');
    expect(res.status).toBe(403);
  });

  it('lets a child list their own chores', async () => {
    // Already logged in as demo-damien.
    const res = await ctx.agent.get('/chores/mine');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
