// â”€â”€â”€ User & Auth Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UserRole = 'admin' | 'driver' | 'client';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  company_name: string;   // clients: raison sociale
  zone: string;           // livreurs: secteur gÃ©ographique (ex: "Ben Arous")
  vehicle: string;        // livreurs: description vÃ©hicule
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  // from auth.users (joined)
  email?: string;
  address?: string;
  city?: string;
  governorate?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UserRole;
  company_name?: string;
  zone?: string;
  vehicle?: string;
}

export interface UpdateUserPayload {
  email?: string;
  full_name?: string;
  phone?: string;
  company_name?: string;
  zone?: string;
  vehicle?: string;
  is_active?: boolean;
}

export interface ClientPricingRule {
  id: string;
  client_id?: string;
  client_name: string;
  company_name: string;
  flat_rate: number; // Tarif unique appliquÃ© partout en Tunisie
  custom_note?: string;
  is_active: boolean;
  updated_at: string;
}

// â”€â”€â”€ API Response Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// â”€â”€â”€ Parcel & Delivery Note Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ParcelStatus =
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'contacted'
  | 'delivered'
  | 'rescheduled'
  | 'customer_absent'
  | 'wrong_address'
  | 'failed'
  | 'returned'
  | 'cancelled'
  | 'refused';

export interface Parcel {
  id: string;
  tracking_number: string;
  sender_id?: string | null;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_secondary_phone?: string;
  recipient_governorate: string;
  recipient_delegation?: string;
  recipient_address: string;
  recipient_postal_code?: string;
  description: string;
  quantity: number;
  weight: number;
  is_fragile: boolean;
  goods_amount: number;
  delivery_fee: number;
  total_amount: number;
  driver_id?: string | null;
  driver_name?: string;
  status: ParcelStatus;
  /** true = l'argent a été remis au client (expéditeur) */
  is_settled?: boolean;
  /** date/heure du règlement */
  settled_at?: string | null;
  /** mode de règlement: 'cheque' | 'especes' */
  settlement_method?: 'cheque' | 'especes' | string | null;
  /** note ou référence du règlement */
  settlement_note?: string;
  /** date/heure d'acceptation (statut accepté ou assigné à un livreur) */
  accepted_at?: string | null;
  /** date/heure de la dernière mise à jour de statut final (livré, retourné, etc.) */
  status_updated_at?: string | null;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateParcelPayload {
  sender_id?: string | null;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_secondary_phone?: string;
  recipient_governorate: string;
  recipient_delegation?: string;
  recipient_address: string;
  recipient_postal_code?: string;
  description: string;
  quantity: number;
  weight: number;
  is_fragile: boolean;
  goods_amount: number;
  delivery_fee?: number;
  total_amount?: number;
  notes?: string;
  driver_name?: string;
}


export interface UpdateParcelPayload {
  sender_name?: string;
  sender_phone?: string;
  sender_address?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_secondary_phone?: string;
  recipient_governorate?: string;
  recipient_delegation?: string;
  recipient_address?: string;
  recipient_postal_code?: string;
  description?: string;
  quantity?: number;
  weight?: number;
  is_fragile?: boolean;
  goods_amount?: number;
  delivery_fee?: number;
  total_amount?: number;
  driver_name?: string;
  driver_id?: string | null;
  status?: ParcelStatus;
  is_settled?: boolean;
  settled_at?: string | null;
  settlement_method?: 'cheque' | 'especes' | string | null;
  settlement_note?: string;
  /** date/heure d'acceptation (rempli auto quand status = 'accepted' | 'assigned') */
  accepted_at?: string | null;
  /** date/heure de la mise a jour de statut final (rempli auto) */
  status_updated_at?: string | null;
  notes?: string;
}
