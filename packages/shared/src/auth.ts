import { z } from 'zod';

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'Le code PIN doit contenir exactement 4 chiffres');

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères');

export const loginPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1, 'Le mot de passe est requis'),
});
export type LoginPasswordInput = z.infer<typeof loginPasswordSchema>;

export const loginPinSchema = z.object({
  userId: z.string().min(1),
  pin: pinSchema,
});
export type LoginPinInput = z.infer<typeof loginPinSchema>;

export type Role = 'PARENT' | 'CHILD';

export interface FamilyMemberSummary {
  id: string;
  firstName: string;
  role: Role;
  /** Whether this member can log in with a PIN (children always; parents only if they set one). */
  hasPinLogin: boolean;
}

export interface AuthenticatedUser {
  id: string;
  familyId: string;
  firstName: string;
  role: Role;
}
