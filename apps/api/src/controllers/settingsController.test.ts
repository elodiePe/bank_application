import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiTestContext, loginAsMember, type ApiTestContext } from '../test-utils/apiTestContext.js';

describe('settingsController (integration, seeded demo family)', () => {
  let ctx: ApiTestContext;

  beforeAll(async () => {
    ctx = await createApiTestContext();
  });

  afterAll(() => ctx.db.teardown());

  it('rejects an unauthenticated request', async () => {
    const res = await ctx.agent.get('/settings');
    expect(res.status).toBe(401);
  });

  it('lets any authenticated member read settings', async () => {
    await loginAsMember(ctx.agent, 'demo-elodie', '3333');
    const res = await ctx.agent.get('/settings');
    expect(res.status).toBe(200);
  });

  it('refuses a child from updating settings', async () => {
    const res = await ctx.agent.put('/settings/currency').send({ currency: 'EUR' });
    expect(res.status).toBe(403);
  });

  it('blocks enabling a gated section on the free (ESSENTIEL) tier, even for an authorized parent', async () => {
    await loginAsMember(ctx.agent, 'demo-papa', '1111');
    const res = await ctx.agent.put('/settings/features').send({ mealPlanEnabled: true });
    expect(res.status).toBe(403);
  });

  it('allows a parent to disable a section on the free tier (no tier check on disabling)', async () => {
    const res = await ctx.agent.put('/settings/features').send({ mealPlanEnabled: false });
    expect(res.status).toBe(200);
  });
});
