export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | unknown;
  timestamp: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  uptime: number;
  environment: string;
  timestamp: string;
}

export interface UserContext {
  userId: string;
  email: string;
  role: 'admin' | 'driver' | 'client';
}
