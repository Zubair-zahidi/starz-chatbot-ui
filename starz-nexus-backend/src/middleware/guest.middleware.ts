import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

/**
 * Attaches a guestId to the request if present.
 * Frontend should send `x-guest-id` for unauthenticated users.
 */
export const attachGuest = (req: Request, _res: Response, next: NextFunction): void => {
  const guestId =
    (req.headers['x-guest-id'] as string | undefined) ||
    (req.headers['X-Guest-Id' as any] as string | undefined) ||
    (req.query.guestId as string | undefined);

  if (guestId && typeof guestId === 'string') {
    req.guestId = guestId;
  }
  next();
};

/**
 * Requires guestId (useful for guest chat endpoints).
 */
export const requireGuest = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.guestId) {
    return next(ApiError.badRequest('Guest ID is required'));
  }
  next();
};

