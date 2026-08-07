import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiTestContext, loginAsMember, type ApiTestContext } from '../test-utils/apiTestContext.js';

describe('billingController (integration, seeded demo family)', () => {
  let ctx: ApiTestContext;

  beforeAll(async () => {
    ctx = await createApiTestContext();
  });

  afterAll(() => ctx.db.teardown());

  it('rejects an unauthenticated request', async () => {
    const res = await ctx.agent.get('/billing/subscription');
    expect(res.status).toBe(401);
  });

  it('returns the free-tier defaults for a family that never subscribed', async () => {
    await loginAsMember(ctx.agent, 'demo-papa', '1111');

    const res = await ctx.agent.get('/billing/subscription');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tier: 'ESSENTIEL',
      status: null,
      maxChildren: 1,
      maxParents: 1,
      sectionsUnlocked: false,
      childrenOverLimit: 2, // demo family already has 3 seeded children, past the free-tier limit of 1
    });
  });

  it('refuses checkout-session to a child (no canManageSettings permission)', async () => {
    await loginAsMember(ctx.agent, 'demo-damien', '5555');

    const res = await ctx.agent.post('/billing/checkout-session').send({ tier: 'FAMILLE' });
    expect(res.status).toBe(403);
  });

  it('webhook: rejects a request with no Stripe-Signature header', async () => {
    const res = await ctx.agent.post('/billing/webhook').set('Content-Type', 'application/json').send({ type: 'test' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'MISSING_SIGNATURE' });
  });

  it('webhook: rejects a request with a bogus Stripe-Signature header', async () => {
    const res = await ctx.agent
      .post('/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 'not-a-real-signature')
      .send({ type: 'test' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'INVALID_SIGNATURE' });
  });
});
