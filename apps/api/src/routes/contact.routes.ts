import { Router } from 'express';
import { createContactService } from '../services/contactService.js';
import { createContactController } from '../controllers/contactController.js';
import { contactRateLimiter } from '../middleware/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createContactRouter() {
  const contactService = createContactService();
  const controller = createContactController(contactService);

  const router = Router();

  router.post(
    '/',
    contactRateLimiter,
    asyncHandler((req, res) => controller.send(req, res)),
  );

  return router;
}
