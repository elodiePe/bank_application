import { z } from 'zod';

const commentSchema = z.string().trim().max(280).optional();
const amountCentsSchema = z
  .number()
  .int('Le montant doit être un nombre entier de centimes')
  .positive('Le montant doit être positif');

export const depositSchema = z.object({
  accountId: z.string().min(1),
  amountCents: amountCentsSchema,
  comment: commentSchema,
});
export type DepositInput = z.infer<typeof depositSchema>;

export const withdrawalSchema = depositSchema;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amountCents: amountCentsSchema,
    comment: commentSchema,
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Choisissez deux enfants différents',
    path: ['toAccountId'],
  });
export type TransferInput = z.infer<typeof transferSchema>;

export const correctionSchema = z.object({
  comment: commentSchema,
});
export type CorrectionInput = z.infer<typeof correctionSchema>;

export const interestRateSchema = z.object({
  rateBps: z
    .number()
    .int()
    .min(0, 'Le taux ne peut pas être négatif')
    .max(10000, 'Le taux ne peut pas dépasser 100%'),
});
export type InterestRateInput = z.infer<typeof interestRateSchema>;

export const weeklyAllowanceSchema = z.object({
  amountCents: z
    .number()
    .int('Le montant doit être un nombre entier de centimes')
    .min(0, 'Le montant ne peut pas être négatif'),
});
export type WeeklyAllowanceInput = z.infer<typeof weeklyAllowanceSchema>;
