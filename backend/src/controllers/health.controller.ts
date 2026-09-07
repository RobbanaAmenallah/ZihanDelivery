import { Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    const health = HealthService.getHealth();
    sendSuccess(res, health, 'API opérationnelle');
  }
}
