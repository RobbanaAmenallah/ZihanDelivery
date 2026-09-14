export const APP_NAME = 'ZIHAN Super Delivery Express';
export const APP_DESCRIPTION = 'Application professionnelle de gestion et de suivi des livraisons';
export const APP_VERSION = '1.0.0';

export const ZIHAN_COMPANY = {
  name: 'ZIHAN SUPER DELIVERY EXPRESS SARL',
  email: 'samiayed1965@gmail.com',
  phone1: '27 394 418',
  phone2: '27 394 137',
  phonesFormatted: '+216 27 394 418 / +216 27 394 137',
  phonesRaw: '27394418 / 27394137',
  whatsApp: '27 394 418',
  whatsAppFull: '+216 27 394 418',
  address: 'Rue des anémones - Nouvelle Médina, Ben Arous, Tunisie',
  website: 'www.zihan.tn',
} as const;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://oszoyestzrxzfmopvocy.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Qhgqt84qhfWO6BLxPuROIQ_QCT-4jvP';

