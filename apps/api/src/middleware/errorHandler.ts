import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.code });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  // Safety net: a service should normally check uniqueness itself and throw a ConflictError
  // with a specific message (see memberService.setOwnEmail) — this only catches a case that
  // slipped through without one, so it never leaks as a raw 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: 'CONFLICT' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
}
