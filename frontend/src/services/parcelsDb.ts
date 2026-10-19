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
            is_settled: Boolean(row.is_settled),
            settled_at: row.settled_at || null,
            settlement_method: row.settlement_method || 'especes',
            settlement_note: row.settlement_note || '',
            accepted_at: row.accepted_at || null,
            status_updated_at: row.status_updated_at || null,
            delivered_at:
              row.delivered_at ||
              (row.status === 'delivered'
                ? row.status_updated_at ||
                  (row.updated_at && row.updated_at !== row.created_at ? row.updated_at : null)
                : null),
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

  // ── Compute auto-timestamps OUTSIDE isConfigured block so local cache can also use them ──
  const now = new Date().toISOString();
  let computedAcceptedAt: string | null | undefined = undefined;
  let computedStatusUpdatedAt: string | null | undefined = undefined;
  let computedDeliveredAt: string | null | undefined = undefined;

  if (payload.status !== undefined) {
    // accepted_at : enregistré une seule fois lors du premier passage en accepted/assigned
    if (payload.status === 'accepted' || payload.status === 'assigned') {
      const cached = getLocalCache().find((p) => p.id === parcelId);
      if (!cached?.accepted_at) {
        computedAcceptedAt = payload.accepted_at ?? now;
      }
    }
    // status_updated_at : mis à jour à chaque changement de statut (hors pending)
    if (payload.status !== 'pending') {
      computedStatusUpdatedAt = payload.status_updated_at ?? now;
    }
    // delivered_at : date de livraison réelle enregistrée lors du passage en livré
    if (payload.status === 'delivered') {
      computedDeliveredAt = payload.delivered_at ?? payload.status_updated_at ?? now;
      if (!computedStatusUpdatedAt) {
        computedStatusUpdatedAt = computedDeliveredAt;
      }
    }
  }
  // Valeurs manuelles explicites (admin corrige une date)
  if (payload.accepted_at !== undefined && computedAcceptedAt === undefined) {
    computedAcceptedAt = payload.accepted_at;
  }
  if (payload.status_updated_at !== undefined && computedStatusUpdatedAt === undefined) {
    computedStatusUpdatedAt = payload.status_updated_at;
  }
  if (payload.delivered_at !== undefined) {
    if (computedDeliveredAt === undefined) computedDeliveredAt = payload.delivered_at;
    if (computedStatusUpdatedAt === undefined) computedStatusUpdatedAt = payload.delivered_at;
  }

  if (isConfigured) {
    try {
      const updateData: Record<string, unknown> = { updated_at: now };

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
      if (payload.notes !== undefined) updateData.notes = payload.notes;
      if (payload.status !== undefined) updateData.status = payload.status;

      // Timestamps calculés en dehors du bloc
      if (computedAcceptedAt !== undefined) updateData.accepted_at = computedAcceptedAt;
      if (computedStatusUpdatedAt !== undefined) updateData.status_updated_at = computedStatusUpdatedAt;
      if (computedDeliveredAt !== undefined) updateData.delivered_at = computedDeliveredAt;

      // 6. Règlement (Settlement)
      if (payload.is_settled !== undefined) {
        updateData.is_settled = Boolean(payload.is_settled);
        updateData.settled_at = payload.is_settled ? (payload.settled_at ?? now) : null;
        if (payload.settlement_method !== undefined) {
          updateData.settlement_method = payload.settlement_method;
        }
        if (payload.settlement_note !== undefined) {
          updateData.settlement_note = payload.settlement_note;
        }
      } else {
        if (payload.settlement_method !== undefined) {
          updateData.settlement_method = payload.settlement_method;
        }
        if (payload.settlement_note !== undefined) {
          updateData.settlement_note = payload.settlement_note;
        }
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parcelId);
      const performUpdate = async (dataToUpdate: Record<string, unknown>) => {
        return isUuid
          ? client.from('parcels').update(dataToUpdate).eq('id', parcelId)
          : client.from('parcels').update(dataToUpdate).eq('tracking_number', parcelId);
      };

      const { error: primaryError } = await performUpdate(updateData);

      // Si erreur Supabase (ex: colonnes inexistantes delivered_at, settlement_method...), repli automatique
      if (primaryError) {
        console.warn('Supabase update warning, tentative repli sans colonnes optionnelles:', primaryError.message);
        const safeData = { ...updateData };
        delete safeData.delivered_at;
        delete safeData.settlement_method;
        delete safeData.settlement_note;

        const { error: fallbackError } = await performUpdate(safeData);
        if (fallbackError) {
          console.warn('Supabase update fallback 1 warning, repli colonnes standard:', fallbackError.message);
          delete safeData.status_updated_at;
          delete safeData.accepted_at;
          delete safeData.is_settled;
          delete safeData.settled_at;

          const { error: coreError } = await performUpdate(safeData);
          if (coreError) {
            console.error('Erreur finale Supabase update parcel:', coreError.message);
          }
        }
      }
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
        // Timestamps calculés (écrasent les éventuelles valeurs dans payload)
        ...(computedAcceptedAt !== undefined ? { accepted_at: computedAcceptedAt } : {}),
        ...(computedStatusUpdatedAt !== undefined ? { status_updated_at: computedStatusUpdatedAt } : {}),
        ...(computedDeliveredAt !== undefined ? { delivered_at: computedDeliveredAt } : {}),
        goods_amount: gAmount,
        delivery_fee: dFee,
        total_amount: tAmount,
        updated_at: now,
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

/**
 * Retourne la date/heure réelle de livraison d'un colis.
 * Priorités :
 * 1. delivered_at (date explicite enregistrée lors de la livraison)
 * 2. status_updated_at (date de mise à jour du statut en livré)
 * 3. updated_at (si différent de created_at, correspond au passage en statut livré)
 * 4. settled_at (date de règlement, postérieure ou égale à la livraison)
 * 5. created_at (en dernier recours uniquement)
 */
export function getParcelDeliveryDate(parcel: Parcel): string {
  if (parcel.delivered_at) return parcel.delivered_at;
  if (parcel.status === 'delivered') {
    if (parcel.status_updated_at) return parcel.status_updated_at;
    if (parcel.updated_at && parcel.updated_at !== parcel.created_at) {
      return parcel.updated_at;
    }
    if (parcel.settled_at) return parcel.settled_at;
  }
  return parcel.created_at;
}

