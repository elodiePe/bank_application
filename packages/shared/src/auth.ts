import { z } from 'zod';

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'Le code PIN doit contenir exactement 4 chiffres');

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères');

export const loginPinSchema = z.object({
  userId: z.string().min(1),
  pin: pinSchema,
});
export type LoginPinInput = z.infer<typeof loginPinSchema>;

export const registerFamilySchema = z.object({
  familyName: z.string().trim().min(1, 'Le nom de la famille est requis').max(80),
  ownerEmail: z.string().trim().email('Adresse e-mail invalide'),
  ownerPassword: passwordSchema,
});
export type RegisterFamilyInput = z.infer<typeof registerFamilySchema>;

export const loginFamilySchema = z.object({
  ownerEmail: z.string().trim().email('Adresse e-mail invalide'),
  ownerPassword: z.string().min(1, 'Le mot de passe est requis'),
});
export type LoginFamilyInput = z.infer<typeof loginFamilySchema>;

export interface FamilySummary {
  id: string;
  name: string;
  ownerEmail: string;
  ownerEmailVerified: boolean;
}

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const confirmAccountDeletionSchema = z.object({
  token: z.string().min(1),
  ownerPassword: z.string().min(1, 'Le mot de passe est requis'),
});
export type ConfirmAccountDeletionInput = z.infer<typeof confirmAccountDeletionSchema>;

export const requestPasswordResetSchema = z.object({
  ownerEmail: z.string().trim().email('Adresse e-mail invalide'),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;

export type Role = 'PARENT' | 'CHILD';

export interface FamilyMemberSummary {
  id: string;
  firstName: string;
  role: Role;
  /** Every member (parent or child) logs in with a PIN. */
  hasPinLogin: boolean;
}

/// The single fixed admin (first parent created for the family) always has full access
/// regardless of the four booleans below, which only apply to non-admin parents.
export interface ParentPermissions {
  isAdmin: boolean;
  canManageMoney: boolean;
  canManageActions: boolean;
  canManageSettings: boolean;
  canManageFamily: boolean;
}

export interface AuthenticatedUser {
  id: string;
  familyId: string;
  firstName: string;
  role: Role;
  email: string | null;
  /** Non-null for PARENT, null for CHILD. */
  permissions: ParentPermissions | null;
  /** Non-null for CHILD, null for PARENT — which dashboard variant to render. */
  interfaceLevel: ChildInterfaceLevel | null;
}

/// Which child dashboard variant to render — chosen directly by a parent (not derived
/// from a birth date), since a parent knows their own child's maturity better than an
/// age calculation would.
export type ChildInterfaceLevel = 'YOUNG' | 'MIDDLE' | 'TEEN';

export const CHILD_INTERFACE_LEVELS: ChildInterfaceLevel[] = ['YOUNG', 'MIDDLE', 'TEEN'];

export const CHILD_INTERFACE_LEVEL_LABELS: Record<ChildInterfaceLevel, string> = {
  YOUNG: '6-8 ans — très simplifié',
  MIDDLE: '9-11 ans — standard',
  TEEN: '12-14 ans — avancé',
};
