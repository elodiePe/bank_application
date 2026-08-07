import type { Request, Response } from 'express';
import { contactMessageSchema } from '@banque-familiale/shared';
import type { ContactService } from '../services/contactService.js';
import { ValidationError } from '../utils/errors.js';

export function createContactController(contactService: ContactService) {
  return {
    async send(req: Request, res: Response) {
      const parsed = contactMessageSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await contactService.send(parsed.data);
      res.status(204).end();
    },
  };
}

export type ContactController = ReturnType<typeof createContactController>;
