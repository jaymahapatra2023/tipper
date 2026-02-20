import type { Response } from 'express';
import type { ApiResponse } from '@tipper/shared';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse['meta'],
) {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const response: ApiResponse = {
    success: false,
    error: { code, message, details },
  };
  return res.status(statusCode).json(response);
}
