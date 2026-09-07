import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Erreur non gérée :', err);

  const errorMessage =
    env.NODE_ENV === 'production'
      ? 'Une erreur interne est survenue sur le serveur'
      : err.message;

  sendError(res, errorMessage, 'Erreur interne du serveur', 500);
}
