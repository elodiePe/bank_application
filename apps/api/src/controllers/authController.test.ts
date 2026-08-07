import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { createApiTestContext, loginAsMember, type ApiTestContext } from '../test-utils/apiTestContext.js';

describe('authController + familyAuthController (integration, seeded demo family)', () => {
  let ctx: ApiTestContext;

  beforeAll(async () => {
    ctx = await createApiTestContext();
  });

  afterAll(() => ctx.db.teardown());

  it('rejects family-owner login with the wrong password', async () => {
    const freshAgent = supertest.agent(ctx.app);
    const res = await freshAgent
      .post('/family-auth/login')
      .send({ ownerEmail: 'owner@banque-familiale.local', ownerPassword: 'not-the-password' });
    expect(res.status).toBe(401);
  });

  it('logs a member in with the correct PIN and sets the auth cookies', async () => {
    const res = await ctx.agent.post('/auth/login-pin').send({ userId: 'demo-papa', pin: '1111' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ firstName: 'Papa', role: 'PARENT' });
    expect(res.headers['set-cookie']?.some((c: string) => c.startsWith('bf_access'))).toBe(true);
  });

  it('rejects a member login with the wrong PIN', async () => {
    const res = await ctx.agent.post('/auth/login-pin').send({ userId: 'demo-papa', pin: '0000' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'INVALID_CREDENTIAL' });
  });

  it('/auth/me is unauthenticated without a session, authenticated once logged in', async () => {
    const anonAgent = supertest.agent(ctx.app);
    const anonRes = await anonAgent.get('/auth/me');
    expect(anonRes.status).toBe(401);

    await loginAsMember(ctx.agent, 'demo-elodie', '3333');
    const meRes = await ctx.agent.get('/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body).toMatchObject({ firstName: 'Elodie', role: 'CHILD' });
  });
});
