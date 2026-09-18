import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import { type Parcel, type CreateParcelPayload, type UpdateParcelPayload, type ParcelStatus, type UserProfile } from '@/types';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';
import { getDbClientPricing } from './clientPricingDb';

const LOCAL_PARCELS_KEY = 'zihan_managed_parcels';

// Governorate pricing rules
export const GRAND_TUNIS_GOVERNORATES = ['Tunis', 'Ariana', 'Ben Arous', 'Manouba'];

export const ALL_TUNISIAN_GOVERNORATES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Nabeul',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Le Kef',
  'Siliana',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Gabès',
  'Médenine',
  'Tataouine',
  'Gafsa',
  'Tozeur',
  'Kébili',
];

export const DEMO_PARCELS: Parcel[] = [];

// ─── Local Cache Helpers ──────────────────────────────────────────────────────

function getLocalCache(): Parcel[] {
  try {
    const cached = localStorage.getItem(LOCAL_PARCELS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Parcel[];
      return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

// ─── Pricing Calculation ──────────────────────────────────────────────────────

export function calculateDeliveryFee(_governorate: string, senderNameOrId?: string): number {
  // Check if there is a flat-rate custom pricing rule for this client
  if (senderNameOrId) {
    try {
      const raw = localStorage.getItem('zihan_client_pricing_rules');
      if (raw) {
        const rules = JSON.parse(raw);
        const search = senderNameOrId.trim().toLowerCase();
        const rule = rules.find(
          (r: { client_name?: string; company_name?: string; client_id?: string; is_active?: boolean }) =>
            r.is_active !== false &&
            (r.client_name?.trim().toLowerCase() === search ||
             r.company_name?.trim().toLowerCase() === search ||
             r.client_id === senderNameOrId)
        );
        if (rule?.flat_rate !== undefined) {
          return rule.flat_rate;
        }
      }
    } catch {
      // fallback
    }
  }

  return 8.0; // Tarif par défaut ZIHAN (toute Tunisie)
}

/**
 * Check if a parcel belongs to a specific client
 * Matches by sender_id, company_name, full_name, or phone
 */
export function isParcelForClient(
  parcel: Parcel,
  profile: UserProfile | null,
  userId?: string | null
): boolean {
  if (!profile && !userId) return false;

  // 1. Exact sender_id match (UUID)
  const targetId = profile?.id || userId;
  if (targetId && parcel.sender_id && parcel.sender_id === targetId) {
    return true;
  }

  // 2. Company name match (case-insensitive)
  if (profile?.company_name && profile.company_name.trim()) {
    const comp = profile.company_name.trim().toLowerCase();
    if (parcel.sender_name && parcel.sender_name.trim().toLowerCase() === comp) {
      return true;
    }
  }

  // 3. Full name match (case-insensitive)
  if (profile?.full_name && profile.full_name.trim()) {
    const fn = profile.full_name.trim().toLowerCase();
    if (parcel.sender_name && parcel.sender_name.trim().toLowerCase() === fn) {
      return true;
    }
  }

  // 4. Phone match (ignoring spaces)
  if (profile?.phone && profile.phone.trim()) {
    const pClean = profile.phone.replace(/\s+/g, '');
    const senderClean = (parcel.sender_phone || '').replace(/\s+/g, '');
    if (pClean && senderClean && pClean === senderClean) {
      return true;
    }
  }

  return false;
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all parcels from Supabase public.parcels table with local cache fallback
 */
export async function getDbParcels(): Promise<{
  parcels: Parcel[];
  source: 'supabase' | 'cache';
  error: string | null;
}> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();
  const localCache = getLocalCache();

  if (isConfigured) {
    try {
      // Refresh client pricing rules in background
      getDbClientPricing().catch(() => {});

      const { data, error } = await client
        .from('parcels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error:', error);
        return {
          parcels: localCache,
          source: 'cache',
          error: `Erreur Supabase : ${error.message}`,
        };
      }

      if (data) {
        const mapped: Parcel[] = data.map((row) => {
          const gAmount = Number(row.goods_amount) || 0;
          const dFee =
            row.delivery_fee !== undefined && row.delivery_fee !== null
              ? Number(row.delivery_fee)
              : calculateDeliveryFee(row.recipient_governorate || 'Tunis', row.sender_name);
          const tAmount =
            row.total_amount !== undefined && row.total_amount !== null
              ? Number(row.total_amount)
              : gAmount + dFee;

          return {
            id: row.id,
            tracking_number: row.tracking_number,
            sender_id: row.sender_id,
            sender_name: row.sender_name || '',
            sender_phone: row.sender_phone || '',
            sender_address: row.sender_address || '',
            recipient_name: row.recipient_name || '',
            recipient_phone: row.recipient_phone || '',
            recipient_secondary_phone: row.recipient_secondary_phone || '',
            recipient_governorate: row.recipient_governorate || 'Tunis',
            recipient_delegation: row.recipient_delegation || '',
            recipient_address: row.recipient_address || '',
            recipient_postal_code: row.recipient_postal_code || '',
            description: row.description || 'Marchandise',
            quantity: Number(row.quantity) || 1,
            weight: Number(row.weight) || 1.0,
            is_fragile: Boolean(row.is_fragile),
            goods_amount: gAmount,
            delivery_fee: dFee,
            total_amount: tAmount,
            driver_id: row.driver_id,
            driver_name: row.driver_name || '',
            status: (row.status as ParcelStatus) || 'pending',
            notes: row.notes || '',
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at,
          };
        });

        // Store latest Supabase data into local cache for offline fallback
        localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify(mapped));
        return { parcels: mapped, source: 'supabase', error: null };
      }
    } catch (err) {
      return {
        parcels: localCache,
        source: 'cache',
        error: `Impossible de joindre Supabase (${(err as Error).message})`,
      };
    }
  }

  return {
    parcels: localCache,
    source: 'cache',
    error: null,
  };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Create a new parcel in Supabase public.parcels & update cache
 */
export async function createDbParcel(
  payload: CreateParcelPayload
): Promise<{ parcel: Parcel; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  const delivery_fee =
    payload.delivery_fee !== undefined && payload.delivery_fee !== null
      ? Number(payload.delivery_fee)
      : calculateDeliveryFee(payload.recipient_governorate, payload.sender_name);
  const goods_amount = Number(payload.goods_amount || 0);
  const total_amount =
    payload.total_amount !== undefined && payload.total_amount !== null
      ? Number(payload.total_amount)
      : goods_amount + delivery_fee;
  const tracking_number = `ZH${Math.floor(100000 + Math.random() * 900000)}`;

  const newParcel: Parcel = {
    id: `parcel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tracking_number,
    sender_id: payload.sender_id || null,
    sender_name: payload.sender_name,
    sender_phone: payload.sender_phone,
    sender_address: payload.sender_address,
    recipient_name: payload.recipient_name,
    recipient_phone: payload.recipient_phone,
    recipient_secondary_phone: payload.recipient_secondary_phone || '',
    recipient_governorate: payload.recipient_governorate,
    recipient_delegation: payload.recipient_delegation || '',
    recipient_address: payload.recipient_address,
    recipient_postal_code: payload.recipient_postal_code || '',
    description: payload.description,
    quantity: Number(payload.quantity || 1),
    weight: Number(payload.weight || 1.0),
    is_fragile: Boolean(payload.is_fragile),
    goods_amount,
    delivery_fee,
    total_amount,
    driver_name: payload.driver_name || '',
    status: 'pending',
    notes: payload.notes || '',
    created_at: new Date().toISOString(),
  };

  let dbErrorMsg: string | null = null;

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('parcels')
        .insert({
          tracking_number: newParcel.tracking_number,
          sender_id: newParcel.sender_id || null,
          sender_name: newParcel.sender_name,
          sender_phone: newParcel.sender_phone,
          sender_address: newParcel.sender_address,
          recipient_name: newParcel.recipient_name,
          recipient_phone: newParcel.recipient_phone,
          recipient_secondary_phone: newParcel.recipient_secondary_phone,
          recipient_governorate: newParcel.recipient_governorate,
          recipient_delegation: newParcel.recipient_delegation,
          recipient_address: newParcel.recipient_address,
          recipient_postal_code: newParcel.recipient_postal_code,
          description: newParcel.description,
          quantity: newParcel.quantity,
          weight: newParcel.weight,
          is_fragile: newParcel.is_fragile,
          goods_amount: newParcel.goods_amount,
          delivery_fee: newParcel.delivery_fee,
          total_amount: newParcel.total_amount,
          driver_name: newParcel.driver_name,
          status: newParcel.status,
          notes: newParcel.notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert parcel error:', error);
        dbErrorMsg = `Erreur Supabase : ${error.message}`;
      } else if (data) {
        newParcel.id = data.id;
      }
    } catch (err) {
      console.error('Supabase exception inserting parcel:', err);
      dbErrorMsg = `Exception Supabase : ${(err as Error).message}`;
    }
  }

  // Update local cache
  const current = getLocalCache();
  const updatedCache = [
    newParcel,
    ...current.filter(
      (p) => p.id !== newParcel.id && p.tracking_number !== newParcel.tracking_number
    ),
  ];
  localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify(updatedCache));

  return { parcel: newParcel, error: dbErrorMsg };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update parcel details, status, driver, or pricing in Supabase & local cache.
 * Can be used by Admin to modify any field at any stage (even after delivery).
 */
export async function updateDbParcel(
  parcelId: string,
  payload: UpdateParcelPayload
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured) {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // 1. Expéditeur (Sender)
      if (payload.sender_name !== undefined) updateData.sender_name = payload.sender_name;
      if (payload.sender_phone !== undefined) updateData.sender_phone = payload.sender_phone;
      if (payload.sender_address !== undefined) updateData.sender_address = payload.sender_address;

      // 2. Destinataire & Adresse (Recipient)
      if (payload.recipient_name !== undefined) updateData.recipient_name = payload.recipient_name;
      if (payload.recipient_phone !== undefined) updateData.recipient_phone = payload.recipient_phone;
      if (payload.recipient_secondary_phone !== undefined)
        updateData.recipient_secondary_phone = payload.recipient_secondary_phone;
      if (payload.recipient_governorate !== undefined)
        updateData.recipient_governorate = payload.recipient_governorate;
      if (payload.recipient_delegation !== undefined)
        updateData.recipient_delegation = payload.recipient_delegation;
      if (payload.recipient_address !== undefined)
        updateData.recipient_address = payload.recipient_address;
      if (payload.recipient_postal_code !== undefined)
        updateData.recipient_postal_code = payload.recipient_postal_code;

      // 3. Marchandise & Poids (Goods)
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.quantity !== undefined) updateData.quantity = Number(payload.quantity);
      if (payload.weight !== undefined) updateData.weight = Number(payload.weight);
      if (payload.is_fragile !== undefined) updateData.is_fragile = Boolean(payload.is_fragile);

      // 4. Tarification & Montants (Pricing)
      if (payload.goods_amount !== undefined) updateData.goods_amount = Number(payload.goods_amount);
      if (payload.delivery_fee !== undefined) updateData.delivery_fee = Number(payload.delivery_fee);
      if (payload.total_amount !== undefined) updateData.total_amount = Number(payload.total_amount);

      // 5. Livreur & Statut (Driver & Status)
      if (payload.driver_name !== undefined) updateData.driver_name = payload.driver_name;
      if (payload.driver_id !== undefined) updateData.driver_id = payload.driver_id;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.notes !== undefined) updateData.notes = payload.notes;

      await client.from('parcels').update(updateData).eq('id', parcelId);
    } catch (err) {
      console.error('Erreur update Supabase parcel:', err);
    }
  }

  // Update local cache
  const current = getLocalCache();
  const updated = current.map((p) => {
    if (p.id === parcelId || p.tracking_number === parcelId) {
      const gAmount = payload.goods_amount !== undefined ? Number(payload.goods_amount) : p.goods_amount;
      const dFee = payload.delivery_fee !== undefined ? Number(payload.delivery_fee) : p.delivery_fee;
      const tAmount =
        payload.total_amount !== undefined
          ? Number(payload.total_amount)
          : payload.goods_amount !== undefined || payload.delivery_fee !== undefined
          ? gAmount + dFee
          : p.total_amount;

      return {
        ...p,
        ...payload,
        goods_amount: gAmount,
        delivery_fee: dFee,
        total_amount: tAmount,
        updated_at: new Date().toISOString(),
      };
    }
    return p;
  });
  localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify(updated));

  return { success: true, error: null };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Delete parcel from Supabase & cache
 */
export async function deleteDbParcel(
  parcelId: string
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured) {
    try {
      await client.from('parcels').delete().eq('id', parcelId);
    } catch { /* ignore */ }
  }

  const current = getLocalCache();
  const filtered = current.filter((p) => p.id !== parcelId && p.tracking_number !== parcelId);
  localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify(filtered));

  return { success: true, error: null };
}

// ─── Convert Parcel to DeliveryNoteData ─────────────────────────────────────────

export function parcelToDeliveryNoteData(parcel: Parcel): DeliveryNoteData {
  const dateObj = parcel.created_at ? new Date(parcel.created_at) : new Date();
  const formattedDate = dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    noteNumber: parcel.tracking_number,
    trackingNumber: parcel.tracking_number,
    createdAt: formattedDate,
    sender: {
      name: parcel.sender_name || 'Expéditeur',
      phone: parcel.sender_phone || '',
      address: parcel.sender_address || '',
      city: '',
      governorate: '',
      postalCode: '',
    },
    recipient: {
      name: parcel.recipient_name,
      phone: parcel.recipient_phone,
      secondaryPhone: parcel.recipient_secondary_phone,
      address: parcel.recipient_address,
      city: parcel.recipient_delegation || parcel.recipient_governorate,
      governorate: parcel.recipient_governorate,
      postalCode: parcel.recipient_postal_code || '',
    },
    items: [
      {
        designation: parcel.description,
        quantity: parcel.quantity,
        unitPrice: parcel.goods_amount / (parcel.quantity || 1),
        total: parcel.goods_amount,
      },
    ],
    parcelValue: parcel.goods_amount,
    deliveryFee: parcel.delivery_fee,
    totalToCollect: parcel.total_amount,
    status: parcel.status.toUpperCase(),
    notes: parcel.notes,
  };
}
