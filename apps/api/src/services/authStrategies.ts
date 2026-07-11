import bcrypt from 'bcrypt';
import type { User } from '@prisma/client';

/**
 * Common shape for a credential verification strategy. Today we only ship password
 * (parents) and PIN (children, optionally parents) strategies, but any future method —
 * WebAuthn/passkeys for Face ID / Touch ID — plugs in the same way: read the stored
 * public key/credential instead of a hash, and verify the assertion instead of comparing
 * a secret. Callers (authService) never need to change.
 */
export interface CredentialStrategy {
  /** Returns false if the user has no credential of this kind configured. */
  verify(user: User, credential: string): Promise<boolean>;
}

export const passwordStrategy: CredentialStrategy = {
  async verify(user, credential) {
    if (!user.passwordHash) return false;
    return bcrypt.compare(credential, user.passwordHash);
  },
};

export const pinStrategy: CredentialStrategy = {
  async verify(user, credential) {
    if (!user.pinHash) return false;
    return bcrypt.compare(credential, user.pinHash);
  },
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}
