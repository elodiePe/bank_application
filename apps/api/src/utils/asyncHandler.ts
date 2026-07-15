import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wraps an async route handler so a rejected promise is forwarded to Express's error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
