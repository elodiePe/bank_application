import { z } from 'zod';
import { pinSchema, type ChildInterfaceLevel, type ParentPermissions } from './auth.js';

export interface FamilyMemberDetail {
  id: string;
  firstName: string;
  role: 'PARENT' | 'CHILD';
  email: string | null;
  hasPinLogin: boolean;
  isActive: boolean;
  /** Non-null for PARENT, null for CHILD. */
  permissions: ParentPermissions | null;
  /** Non-null for CHILD, null for PARENT. */
  interfaceLevel: ChildInterfaceLevel | null;
}

export const updatePermissionsSchema = z.object({
  canManageMoney: z.boolean(),
  canManageActions: z.boolean(),
  canManageSettings: z.boolean(),
  canManageFamily: z.boolean(),
});
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;

export const setEmailSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide"),
});
export type SetEmailInput = z.infer<typeof setEmailSchema>;

export const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
});
export type ChangePinInput = z.infer<typeof changePinSchema>;

export const resetPinSchema = z.object({
  newPin: pinSchema,
});
export type ResetPinInput = z.infer<typeof resetPinSchema>;

export const setPointsVisibilitySchema = z.object({
  show: z.boolean(),
});
export type SetPointsVisibilityInput = z.infer<typeof setPointsVisibilitySchema>;

export const confirmMemberPinResetSchema = z.object({
  token: z.string().min(1),
  newPin: pinSchema,
});
export type ConfirmMemberPinResetInput = z.infer<typeof confirmMemberPinResetSchema>;

export const deactivateMemberSchema = z.object({
  confirmEmail: z.string().trim().email("Adresse e-mail invalide"),
});
export type DeactivateMemberInput = z.infer<typeof deactivateMemberSchema>;

export const bootstrapParentSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(50),
  pin: pinSchema,
});
export type BootstrapParentInput = z.infer<typeof bootstrapParentSchema>;

export const addMemberSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(50),
  role: z.enum(['PARENT', 'CHILD']),
  pin: pinSchema,
  /// Only meaningful when role is PARENT — defaults to full access when omitted.
  canManageMoney: z.boolean().optional(),
  canManageActions: z.boolean().optional(),
  canManageSettings: z.boolean().optional(),
  canManageFamily: z.boolean().optional(),
  /// Only meaningful when role is CHILD — defaults to MIDDLE when omitted.
  interfaceLevel: z.enum(['YOUNG', 'MIDDLE', 'TEEN']).optional(),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const setChildInterfaceLevelSchema = z.object({
  interfaceLevel: z.enum(['YOUNG', 'MIDDLE', 'TEEN']),
});
export type SetChildInterfaceLevelInput = z.infer<typeof setChildInterfaceLevelSchema>;
