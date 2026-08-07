import { z } from 'zod';

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email("Adresse e-mail invalide"),
  message: z.string().trim().min(10, 'Le message doit contenir au moins 10 caractères').max(2000),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
