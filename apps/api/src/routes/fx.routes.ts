import { Router } from 'express';
import { createFxService } from '../services/fxService.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createFxRouter() {
  const fxService = createFxService();
  const router = Router();
  router.use(authenticate);

  router.get(
    '/rate/:target',
    asyncHandler(async (req, res) => {
      const rate = await fxService.getRate(String(req.params.target).toUpperCase());
      res.json(rate);
    }),
  );

  return router;
}
