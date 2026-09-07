import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  sendError(
    res,
    `Route non trouvée : ${req.method} ${req.originalUrl}`,
    'Ressource introuvable',
    404
  );
}
