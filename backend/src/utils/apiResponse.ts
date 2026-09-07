import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

/**
 * Standardized successful response helper.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Standardized error response helper.
 */
export function sendError(
  res: Response,
  error: string | unknown,
  message: string = 'Une erreur est survenue',
  statusCode: number = 500
): Response<ApiResponse<null>> {
  return res.status(statusCode).json({
    success: false,
    message,
    error: typeof error === 'string' ? error : (error as Error)?.message || error,
    timestamp: new Date().toISOString(),
  });
}
