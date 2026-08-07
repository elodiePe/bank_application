import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiTestContext, loginAsMember, type ApiTestContext } from '../test-utils/apiTestContext.js';

describe('memberController (integration, seeded demo family)', () => {
  let ctx: ApiTestContext;

  beforeAll(async () => {
    ctx = await createApiTestContext();
    await loginAsMember(ctx.agent, 'demo-papa', '1111');
  });

  afterAll(() => ctx.db.teardown());

  it('rejects invalid input on add member', async () => {
    const res = await ctx.agent.post('/members').send({ firstName: '', role: 'CHILD', pin: '12' });
    expect(res.status).toBe(400);
  });

  it('refuses to add a child past the free-tier child limit (seeded family already has 3)', async () => {
    const res = await ctx.agent.post('/members').send({
      firstName: 'Nouveau',
      role: 'CHILD',
      pin: '7777',
      parentalConsent: true,
    });
    expect(res.status).toBe(403);
  });

  it('adds a new child member once the family is upgraded past the child limit', async () => {
    await ctx.db.prisma.family.update({
      where: { id: 'demo-family' },
      data: { subscriptionTier: 'GRANDE_FAMILLE' },
    });

    const res = await ctx.agent.post('/members').send({
      firstName: 'Nouveau',
      role: 'CHILD',
      pin: '7777',
      parentalConsent: true,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ firstName: 'Nouveau', role: 'CHILD' });

    const listRes = await ctx.agent.get('/members');
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((m: { firstName: string }) => m.firstName === 'Nouveau')).toBe(true);
  });

  it('refuses a child from adding a member', async () => {
    await loginAsMember(ctx.agent, 'demo-damien', '5555');
    const res = await ctx.agent.post('/members').send({
      firstName: 'Autre',
      role: 'CHILD',
      pin: '8888',
      parentalConsent: true,
    });
    expect(res.status).toBe(403);
  });
});
