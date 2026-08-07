import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { createApiTestContext, loginAsMember, type ApiTestContext } from '../test-utils/apiTestContext.js';

/** Defense-in-depth: every route scopes its lookups by the caller's own familyId (never trusts
 * a client-supplied id in isolation), so a member of one family can never read or mutate another
 * family's data just by knowing/guessing its id. Family A is the seeded demo family; Family B is
 * a second, freshly registered family sharing the same test database — the only realistic way
 * two families ever coexist in production. */
describe('cross-tenant access (defense-in-depth, two families in the same database)', () => {
  let familyA: ApiTestContext;
  let familyBAgent: ReturnType<typeof supertest.agent>;
  let familyAChoreId: string;

  beforeAll(async () => {
    familyA = await createApiTestContext();
    await loginAsMember(familyA.agent, 'demo-papa', '1111');

    const createRes = await familyA.agent.post('/chores').send({
      childUserId: 'demo-damien',
      title: 'Tâche de la famille A',
      rewardType: 'MONEY',
      rewardCents: 50,
      recurrence: 'DAILY',
    });
    familyAChoreId = createRes.body.id;

    familyBAgent = supertest.agent(familyA.app);
    await familyBAgent
      .post('/family-auth/register')
      .send({
        familyName: 'Famille B',
        ownerEmail: 'owner-b@example.com',
        ownerPassword: 'password123',
        acceptedTerms: true,
      })
      .expect(201);
    const bootstrapRes = await familyBAgent
      .post('/members/bootstrap-parent')
      .send({ firstName: 'ParentB', pin: '9999' })
      .expect(201);
    await loginAsMember(familyBAgent, bootstrapRes.body.id, '9999');
  }, 30_000);

  afterAll(() => familyA.db.teardown());

  it('never lists another family\'s members', async () => {
    const res = await familyBAgent.get('/members');
    expect(res.status).toBe(200);
    expect(res.body.every((m: { firstName: string }) => m.firstName !== 'Papa')).toBe(true);
  });

  it('never lists another family\'s chores', async () => {
    const res = await familyBAgent.get('/chores');
    expect(res.status).toBe(200);
    expect(res.body.some((c: { id: string }) => c.id === familyAChoreId)).toBe(false);
  });

  it('refuses to change another family\'s member interface level, even with a known id', async () => {
    const res = await familyBAgent.patch('/members/demo-elodie/interface-level').send({ interfaceLevel: 'TEEN' });
    expect(res.status).toBe(404);
  });

  it('refuses to reset another family\'s member PIN, even with a known id', async () => {
    const res = await familyBAgent.post('/members/demo-elodie/reset-pin').send({ newPin: '4444' });
    expect(res.status).toBe(404);
  });

  it('refuses to delete another family\'s chore, even with a known id', async () => {
    const res = await familyBAgent.delete(`/chores/${familyAChoreId}`);
    expect(res.status).toBe(404);

    // Confirm it genuinely survived — not just a generic error swallowing the delete.
    const stillThere = await familyA.agent.get('/chores');
    expect(stillThere.body.some((c: { id: string }) => c.id === familyAChoreId)).toBe(true);
  });

  it('returns its own (empty) overview, never family A\'s children', async () => {
    const res = await familyBAgent.get('/dashboard/overview');
    expect(res.status).toBe(200);
    expect(res.body.children.some((c: { firstName: string }) => c.firstName === 'Elodie')).toBe(false);
  });

  it('returns its own free-tier subscription defaults, unaffected by family A', async () => {
    const res = await familyBAgent.get('/billing/subscription');
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('ESSENTIEL');
    expect(res.body.childrenOverLimit).toBe(0);
  });
});
