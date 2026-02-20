import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', err.flatten().fieldErrors);
  }

  console.error('Unhandled error:', err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
