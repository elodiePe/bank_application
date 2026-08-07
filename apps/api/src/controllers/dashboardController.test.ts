import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiTestContext, loginAsMember, type ApiTestContext } from '../test-utils/apiTestContext.js';

describe('dashboardController (integration, seeded demo family)', () => {
  let ctx: ApiTestContext;

  beforeAll(async () => {
    ctx = await createApiTestContext();
  });

  afterAll(() => ctx.db.teardown());

  it('rejects an unauthenticated request', async () => {
    const res = await ctx.agent.get('/dashboard/overview');
    expect(res.status).toBe(401);
  });

  it("returns the parent's overview once logged in", async () => {
    await loginAsMember(ctx.agent, 'demo-papa', '1111');

    const res = await ctx.agent.get('/dashboard/overview');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.children)).toBe(true);
    expect(res.body.children.some((c: { firstName: string }) => c.firstName === 'Elodie')).toBe(true);
  });

  it('refuses a parent-only route to a child', async () => {
    await loginAsMember(ctx.agent, 'demo-elodie', '3333');

    const res = await ctx.agent.get('/dashboard/overview');
    expect(res.status).toBe(403);
  });

  it("returns the child's own overview on the child route", async () => {
    // Already logged in as demo-elodie from the previous test.
    const res = await ctx.agent.get('/dashboard/me/overview');
    expect(res.status).toBe(200);
    expect(typeof res.body.balanceCents).toBe('number');
    expect(res.body.siblings.some((s: { firstName: string }) => s.firstName === 'Matthieu')).toBe(true);
  });
});
