import { z } from 'zod';
import { passwordSchema, pinSchema } from './auth.js';

export interface FamilyMemberDetail {
  id: string;
  firstName: string;
  role: 'PARENT' | 'CHILD';
  email: string | null;
  hasPasswordLogin: boolean;
  hasPinLogin: boolean;
  isActive: boolean;
}

export const setEmailSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide"),
});
export type SetEmailInput = z.infer<typeof setEmailSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
});
export type ChangePinInput = z.infer<typeof changePinSchema>;

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resetPinSchema = z.object({
  newPin: pinSchema,
});
export type ResetPinInput = z.infer<typeof resetPinSchema>;

export const confirmMemberPasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});
export type ConfirmMemberPasswordResetInput = z.infer<typeof confirmMemberPasswordResetSchema>;

export const deactivateMemberSchema = z.object({
  confirmEmail: z.string().trim().email("Adresse e-mail invalide"),
});
export type DeactivateMemberInput = z.infer<typeof deactivateMemberSchema>;

export const bootstrapParentSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(50),
  password: passwordSchema,
});
export type BootstrapParentInput = z.infer<typeof bootstrapParentSchema>;

export const addMemberSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Le prénom est requis').max(50),
    role: z.enum(['PARENT', 'CHILD']),
    password: passwordSchema.optional(),
    pin: pinSchema.optional(),
  })
  .refine((data) => data.role !== 'PARENT' || Boolean(data.password), {
    message: 'Un mot de passe est requis pour un compte parent',
    path: ['password'],
  })
  .refine((data) => data.role !== 'CHILD' || Boolean(data.pin), {
    message: 'Un code PIN est requis pour un compte enfant',
    path: ['pin'],
  });
export type AddMemberInput = z.infer<typeof addMemberSchema>;
