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
  acceptedTerms: z.boolean().refine((v) => v === true, {
    message: 'Tu dois accepter les CGU et la politique de confidentialité pour continuer.',
  }),
});
export type RegisterFamilyInput = z.infer<typeof registerFamilySchema>;

export const loginFamilySchema = z.object({
  ownerEmail: z.string().trim().email('Adresse e-mail invalide'),
  ownerPassword: z.string().min(1, 'Le mot de passe est requis'),
});
export type LoginFamilyInput = z.infer<typeof loginFamilySchema>;

/** Returned by /family-auth/login: the password step alone never finishes the login, the
 * emailed 6-digit code (verified via verifyOwnerMfaSchema below) does. */
export interface LoginFamilyMfaChallenge {
  mfaRequired: true;
  familyId: string;
  /** Only ever present outside production — a local/test convenience, never relied on by the UI. */
  devCode?: string;
}

export const verifyOwnerMfaSchema = z.object({
  familyId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
});
export type VerifyOwnerMfaInput = z.infer<typeof verifyOwnerMfaSchema>;

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
  /** Non-null for CHILD, null for PARENT — whether this child's own points count is shown
   * on their dashboard. Only a TEEN-interface child can change it (see setPointsVisibilitySchema). */
  showPointsBalance: boolean | null;
}

/// Which child dashboard variant to render — chosen directly by a parent (not derived
/// from a birth date), since a parent knows their own child's maturity better than an
/// age calculation would.
export type ChildInterfaceLevel = 'YOUNG' | 'MIDDLE' | 'TEEN';

export const CHILD_INTERFACE_LEVELS: ChildInterfaceLevel[] = ['YOUNG', 'MIDDLE', 'TEEN'];

export const CHILD_INTERFACE_LEVEL_LABELS: Record<ChildInterfaceLevel, string> = {
  YOUNG: 'Très simplifié',
  MIDDLE: 'Standard',
  TEEN: 'Avancé',
};

/// Shown next to the interface-level picker (onboarding, ajout de membre, gestion de la
/// famille) so a parent can tell the three apart now that the labels no longer carry an age
/// range — kept in sync with the actual behavioral differences: YOUNG has no navigation at
/// all (DashboardRouter), MIDDLE gets the full nav but no "Mode gestion" access, TEEN adds
/// "Mode gestion" (édition du planning repas/ménage) and visibilité de ses points.
export const CHILD_INTERFACE_LEVEL_DESCRIPTIONS: Record<ChildInterfaceLevel, string> = {
  YOUNG: 'Une seule page toute simple, sans menu ni navigation — pensé pour les plus jeunes.',
  MIDDLE: 'Navigation complète (Argent, Maison, Demandes, Paramètres), comme un adulte, mais sans les outils de gestion avancés.',
  TEEN: 'Comme Standard, avec en plus le "Mode gestion" pour modifier soi-même le planning des repas/du ménage.',
};
