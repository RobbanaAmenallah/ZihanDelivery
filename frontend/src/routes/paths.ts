export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  TRACKING: '/tracking/:trackingNumber',

  // Admin Portal
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SHIPMENTS: '/admin/shipments',
  ADMIN_PRICING: '/admin/pricing',
  ADMIN_DRIVERS: '/admin/drivers',
  ADMIN_CLIENTS: '/admin/clients',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_ANALYTICS: '/admin/analytics',

  // Client Portal
  CLIENT: '/client',
  CLIENT_SHIPMENTS: '/client/shipments',
  CLIENT_CREATE: '/client/create',
  CLIENT_INVOICES: '/client/invoices',

  // Driver Portal
  DRIVER: '/driver',
  DRIVER_TOUR: '/driver/tour',
  DRIVER_HISTORY: '/driver/history',

  // Profile (shared for all roles)
  PROFILE: '/profile',

  // Legacy redirect
  DESIGN_SYSTEM: '/design-system',
} as const;
