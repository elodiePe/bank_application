import bcrypt from 'bcrypt';
import type { Family, PrismaClient } from '@prisma/client';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { signEmailActionToken, signFamilyOwnerToken, verifyEmailActionToken } from './tokenService.js';
import { sendEmail } from './emailService.js';
import {
  accountDeletedTemplate,
  deleteAccountRequestTemplate,
  passwordChangedTemplate,
  resetPasswordRequestTemplate,
  verifyEmailTemplate,
} from '../emails/templates.js';
import { env } from '../utils/env.js';

const SALT_ROUNDS = 12;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type RegisterFamilyResult =
  | { ok: true; familyId: string; familyName: string; token: string }
  | { ok: false; reason: 'email_taken' };

export type LoginFamilyResult =
  | { ok: true; familyId: string; familyName: string; token: string }
  | { ok: false; reason: 'not_found' | 'invalid_credential' | 'locked' };

export type VerifyEmailResult = { ok: true } | { ok: false; reason: 'invalid_token' | 'not_found' };

export type ConfirmDeletionResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'not_found' | 'invalid_credential' };

export type ConfirmPasswordResetResult = { ok: true } | { ok: false; reason: 'invalid_token' | 'not_found' };

function toToken(family: Family): string {
  return signFamilyOwnerToken({ familyId: family.id, ownerEmail: family.ownerEmail });
}

export function createFamilyAuthService(prisma: PrismaClient) {
  const familyRepo = createFamilyRepository(prisma);

  return {
    async registerFamily(params: {
      familyName: string;
      ownerEmail: string;
      ownerPassword: string;
    }): Promise<RegisterFamilyResult> {
      const existing = await familyRepo.findByOwnerEmail(params.ownerEmail);
      if (existing) return { ok: false, reason: 'email_taken' };

      const ownerPasswordHash = await bcrypt.hash(params.ownerPassword, SALT_ROUNDS);
      const family = await familyRepo.create({
        name: params.familyName,
        ownerEmail: params.ownerEmail,
        ownerPasswordHash,
      });

      const verifyToken = signEmailActionToken({
        familyId: family.id,
        email: family.ownerEmail,
        action: 'verify-email',
      });
      const { subject, html } = verifyEmailTemplate({
        familyName: family.name,
        verifyUrl: `${env.webOrigin}/verify-email?token=${verifyToken}`,
      });
      void sendEmail({ to: family.ownerEmail, subject, html });

      return { ok: true, familyId: family.id, familyName: family.name, token: toToken(family) };
    },

    async loginFamilyOwner(params: { ownerEmail: string; ownerPassword: string }): Promise<LoginFamilyResult> {
      const family = await familyRepo.findByOwnerEmail(params.ownerEmail);
      if (!family) return { ok: false, reason: 'not_found' };

      if (family.ownerLockedUntil && family.ownerLockedUntil.getTime() > Date.now()) {
        return { ok: false, reason: 'locked' };
      }

      const valid = await bcrypt.compare(params.ownerPassword, family.ownerPasswordHash);
      if (!valid) {
        await familyRepo.recordFailedOwnerLogin(family.id, {
          maxAttempts: LOCKOUT_MAX_ATTEMPTS,
          lockoutMs: LOCKOUT_DURATION_MS,
        });
        return { ok: false, reason: 'invalid_credential' };
      }

      await familyRepo.resetFailedOwnerLogins(family.id);
      return { ok: true, familyId: family.id, familyName: family.name, token: toToken(family) };
    },

    async getFamily(familyId: string) {
      const family = await familyRepo.findById(familyId);
      return family
        ? {
            id: family.id,
            name: family.name,
            ownerEmail: family.ownerEmail,
            ownerEmailVerified: family.ownerEmailVerifiedAt !== null,
          }
        : null;
    },

    async verifyEmail(token: string): Promise<VerifyEmailResult> {
      const payload = verifyEmailActionToken(token);
      if (!payload || payload.action !== 'verify-email') return { ok: false, reason: 'invalid_token' };

      const family = await familyRepo.findById(payload.familyId);
      if (!family || family.ownerEmail !== payload.email) return { ok: false, reason: 'not_found' };

      await familyRepo.markOwnerEmailVerified(family.id);
      return { ok: true };
    },

    async requestAccountDeletion(familyId: string): Promise<void> {
      const family = await familyRepo.findById(familyId);
      if (!family) return;

      const deleteToken = signEmailActionToken({
        familyId: family.id,
        email: family.ownerEmail,
        action: 'delete-account',
      });
      const { subject, html } = deleteAccountRequestTemplate({
        familyName: family.name,
        confirmUrl: `${env.webOrigin}/delete-family?token=${deleteToken}`,
      });
      await sendEmail({ to: family.ownerEmail, subject, html });
    },

    async confirmAccountDeletion(params: { token: string; ownerPassword: string }): Promise<ConfirmDeletionResult> {
      const payload = verifyEmailActionToken(params.token);
      if (!payload || payload.action !== 'delete-account') return { ok: false, reason: 'invalid_token' };

      const family = await familyRepo.findById(payload.familyId);
      if (!family || family.ownerEmail !== payload.email) return { ok: false, reason: 'not_found' };

      const valid = await bcrypt.compare(params.ownerPassword, family.ownerPasswordHash);
      if (!valid) return { ok: false, reason: 'invalid_credential' };

      // Notify before deleting — afterwards there is no family record left to read the
      // address from, and the whole point is to confirm the irreversible action happened.
      const { subject, html } = accountDeletedTemplate({ familyName: family.name });
      await sendEmail({ to: family.ownerEmail, subject, html });

      await familyRepo.delete(family.id);
      return { ok: true };
    },

    /** Always resolves the same way regardless of whether the email exists, so the
     * response can't be used to enumerate registered family accounts. */
    async requestPasswordReset(ownerEmail: string): Promise<void> {
      const family = await familyRepo.findByOwnerEmail(ownerEmail);
      if (!family) return;

      const resetToken = signEmailActionToken({
        familyId: family.id,
        email: family.ownerEmail,
        action: 'reset-password',
      });
      const { subject, html } = resetPasswordRequestTemplate({
        familyName: family.name,
        resetUrl: `${env.webOrigin}/reset-password?type=family&token=${resetToken}`,
      });
      await sendEmail({ to: family.ownerEmail, subject, html });
    },

    async confirmPasswordReset(params: { token: string; newPassword: string }): Promise<ConfirmPasswordResetResult> {
      const payload = verifyEmailActionToken(params.token);
      if (!payload || payload.action !== 'reset-password') return { ok: false, reason: 'invalid_token' };

      const family = await familyRepo.findById(payload.familyId);
      if (!family || family.ownerEmail !== payload.email) return { ok: false, reason: 'not_found' };

      const ownerPasswordHash = await bcrypt.hash(params.newPassword, SALT_ROUNDS);
      await familyRepo.setOwnerPasswordHash(family.id, ownerPasswordHash);

      const { subject, html } = passwordChangedTemplate({ firstName: family.name });
      void sendEmail({ to: family.ownerEmail, subject, html });

      return { ok: true };
    },
  };
}

export type FamilyAuthService = ReturnType<typeof createFamilyAuthService>;
