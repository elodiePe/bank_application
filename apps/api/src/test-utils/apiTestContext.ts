import supertest from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from './testDb.js';

export interface ApiTestContext {
  db: TestDb;
  app: Express;
  /** A cookie-persisting agent, already logged in as the family owner (but not as any
   * individual member yet — call loginAsMember for that). Use `supertest.agent(ctx.app)` to
   * get a second, independent (not-yet-logged-in) agent against the same app/DB. */
  agent: ReturnType<typeof supertest.agent>;
}

/** Spins up an isolated test-schema Prisma client, seeds the demo family into it, and wires a
 * real Express app (via createApp's injectable prisma param) around that same client — so
 * these are true integration tests: real routes, real middleware, real DB, no mocking. */
export async function createApiTestContext(): Promise<ApiTestContext> {
  const db = createTestDb();
  await seedDemoFamily(db.prisma);
  const app = createApp(db.prisma);
  const agent = supertest.agent(app);

  const loginRes = await agent
    .post('/family-auth/login')
    .send({
      ownerEmail: process.env.FAMILY_OWNER_EMAIL ?? 'owner@banque-familiale.local',
      ownerPassword: process.env.FAMILY_OWNER_PASSWORD ?? 'demo-owner-password',
    })
    .expect(200);

  // Login now only starts the MFA challenge — devCode is the outside-production escape hatch
  // (see familyAuthService.loginFamilyOwner) that lets tests finish it without a real inbox.
  await agent
    .post('/family-auth/verify-mfa')
    .send({ familyId: loginRes.body.familyId, code: loginRes.body.devCode })
    .expect(200);

  return { db, app, agent };
}

/** Logs the given agent in as one seeded member (demo-papa/1111, demo-maman/2222,
 * demo-elodie/3333, demo-matthieu/4444, demo-damien/5555) — sets the member access/refresh
 * cookies on top of the family-owner cookie already set by createApiTestContext. */
export async function loginAsMember(
  agent: ReturnType<typeof supertest.agent>,
  userId: string,
  pin: string,
): Promise<void> {
  await agent.post('/auth/login-pin').send({ userId, pin }).expect(200);
}
