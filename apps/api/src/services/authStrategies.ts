import bcrypt from 'bcrypt';
import type { User } from '@prisma/client';

/**
 * Common shape for a credential verification strategy. Today every member (parent or
 * child) logs in with a PIN, but any future method — WebAuthn/passkeys for Face ID /
 * Touch ID — plugs in the same way: read the stored public key/credential instead of a
 * hash, and verify the assertion instead of comparing a secret. Callers (authService)
 * never need to change.
 */
export interface CredentialStrategy {
  /** Returns false if the user has no credential of this kind configured. */
  verify(user: User, credential: string): Promise<boolean>;
}

export const pinStrategy: CredentialStrategy = {
  async verify(user, credential) {
    if (!user.pinHash) return false;
    return bcrypt.compare(credential, user.pinHash);
  },
};

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}
