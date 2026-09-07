import { HealthStatus } from '../types/index.js';
import { env } from '../config/env.js';

export class HealthService {
  public static getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'ZIHAN Super Delivery Express Backend API',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }
}
