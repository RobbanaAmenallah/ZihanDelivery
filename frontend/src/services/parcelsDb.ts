import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import { type Parcel, type CreateParcelPayload, type UpdateParcelPayload, type ParcelStatus } from '@/types';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';

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

export const DEMO_PARCELS: Parcel[] = [
  {
    id: 'p-001',
    tracking_number: 'ZH000153',
    sender_name: 'Boutique Express Mode',
    sender_phone: '+216 71 888 999',
    sender_address: '12 Rue des Entrepreneurs, Charguia 2, Tunis',
    recipient_name: 'Mohamed Ben Ali',
    recipient_phone: '+216 22 000 000',
    recipient_secondary_phone: '+216 98 111 222',
    recipient_governorate: 'Ben Arous',
    recipient_delegation: 'Nouvelle Médina',
    recipient_address: 'Résidence Ennasr, Bloc B, Apt 14',
    recipient_postal_code: '2063',
    description: 'Chaussures Sport ZIHAN Runner Pro (Taille 42)',
    quantity: 1,
    weight: 1.2,
    is_fragile: false,
    goods_amount: 70.0,
    delivery_fee: 7.0,
    total_amount: 77.0,
    driver_name: 'Karim Mansouri',
    status: 'in_transit',
    notes: 'Appeler avant livraison',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'p-002',
    tracking_number: 'ZH000154',
    sender_name: 'Boutique Express Mode',
    sender_phone: '+216 71 888 999',
    sender_address: '12 Rue des Entrepreneurs, Charguia 2, Tunis',
    recipient_name: 'Sonia Trabelsi',
    recipient_phone: '+216 55 123 456',
    recipient_governorate: 'Tunis',
    recipient_delegation: 'Menzah 6',
    recipient_address: '14 Rue des Jasmins',
    recipient_postal_code: '1004',
    description: 'Robe de soirée élégante noire (Taille M)',
    quantity: 1,
    weight: 0.8,
    is_fragile: false,
    goods_amount: 120.0,
    delivery_fee: 7.0,
    total_amount: 127.0,
    driver_name: 'Karim Mansouri',
    status: 'delivered',
    notes: 'Livré et encaissé en espèces',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'p-003',
    tracking_number: 'ZH000155',
    sender_name: 'Tech Express TN',
    sender_phone: '+216 70 555 444',
    sender_address: 'Centre Urbain Nord, Tunis',
    recipient_name: 'Khaled Ayari',
    recipient_phone: '+216 98 444 333',
    recipient_governorate: 'Sousse',
    recipient_delegation: 'Sousse Ville',
    recipient_address: 'Avenue Habib Bourguiba, Résidence du Port',
    recipient_postal_code: '4000',
    description: 'Écouteurs sans fil Bluetooth Pro + Coque',
    quantity: 2,
    weight: 0.4,
    is_fragile: true,
    goods_amount: 95.0,
    delivery_fee: 10.0,
    total_amount: 105.0,
    driver_name: '',
    status: 'accepted',
    notes: 'Colis fragile - Hors Grand Tunis',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'p-004',
    tracking_number: 'ZH000156',
    sender_name: 'Cosmétique Bio Tunisie',
    sender_phone: '+216 72 333 222',
    sender_address: 'Nabeul',
    recipient_name: 'Amira Dridi',
    recipient_phone: '+216 24 999 888',
    recipient_governorate: 'Ariana',
    recipient_delegation: 'Ennasr 2',
    recipient_address: 'Avenue Hédi Nouira, Immeuble Panorama',
    recipient_postal_code: '2037',
    description: 'Pack Soins Visage Naturel Argan & Rose',
    quantity: 1,
    weight: 1.5,
    is_fragile: true,
    goods_amount: 65.0,
    delivery_fee: 7.0,
    total_amount: 72.0,
    driver_name: 'Karim Mansouri',
    status: 'pending',
    notes: 'À récupérer chez le commerçant',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'p-005',
    tracking_number: 'ZH000160',
    sender_name: 'Boutique Express Mode',
    sender_phone: '+216 71 888 999',
    sender_address: '12 Rue des Entrepreneurs, Charguia 2, Tunis',
    recipient_name: 'Yassine Trabelsi',
    recipient_phone: '+216 29 456 789',
    recipient_secondary_phone: '+216 50 112 233',
    recipient_governorate: 'Ben Arous',
    recipient_delegation: 'Nouvelle Médina',
    recipient_address: 'Rue des Anémones, Résidence El Yasmine, Apt 4',
    recipient_postal_code: '2063',
    description: 'Costume Homme Slim Fit Bleu Marine + Chemise Blanche',
    quantity: 1,
    weight: 1.8,
    is_fragile: false,
    goods_amount: 185.0,
    delivery_fee: 7.0,
    total_amount: 192.0,
    driver_name: 'Karim Mansouri',
    status: 'in_transit',
    notes: 'Client prévenu par SMS - Paiement en espèces',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'p-006',
    tracking_number: 'ZH000161',
    sender_name: 'Parfumerie Alyssa',
    sender_phone: '+216 71 334 556',
    sender_address: 'Avenue Habib Bourguiba, Tunis',
    recipient_name: 'Mariem Khemir',
    recipient_phone: '+216 93 888 777',
    recipient_governorate: 'Tunis',
    recipient_delegation: 'Menzah 9',
    recipient_address: 'Résidence Les Pins, Bloc C, 3ème étage',
    recipient_postal_code: '1013',
    description: 'Coffret Parfum Luxe Oriental Eau de Parfum 100ml',
    quantity: 1,
    weight: 0.6,
    is_fragile: true,
    goods_amount: 145.0,
    delivery_fee: 7.0,
    total_amount: 152.0,
    driver_name: 'Karim Mansouri',
    status: 'assigned',
    notes: 'Attention très fragile - Livraison avant 16h souhaitée',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'p-007',
    tracking_number: 'ZH000162',
    sender_name: 'Tech Express TN',
    sender_phone: '+216 70 555 444',
    sender_address: 'Centre Urbain Nord, Tunis',
    recipient_name: 'Anis Bouazizi',
    recipient_phone: '+216 52 345 678',
    recipient_governorate: 'Ariana',
    recipient_delegation: 'Ennasr 2',
    recipient_address: 'Avenue Hédi Nouira, Immeuble Golden Towers',
    recipient_postal_code: '2037',
    description: 'Montre Connectée Smartwatch Ultra + 2 Bracelets Sport',
    quantity: 1,
    weight: 0.5,
    is_fragile: true,
    goods_amount: 220.0,
    delivery_fee: 7.0,
    total_amount: 227.0,
    driver_name: 'Karim Mansouri',
    status: 'contacted',
    notes: 'Client contacté par téléphone - Rdv fixé à 14h30',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'p-008',
    tracking_number: 'ZH000163',
    sender_name: 'Maison du Cuir',
    sender_phone: '+216 71 998 877',
    sender_address: 'Rue de Rome, Tunis',
    recipient_name: 'Nadia Belhadj',
    recipient_phone: '+216 26 777 999',
    recipient_governorate: 'Ben Arous',
    recipient_delegation: 'Megrine Riadh',
    recipient_address: '18 Rue Ibn Khaldoun',
    recipient_postal_code: '2033',
    description: 'Sac à main en cuir véritable bordeaux artisanal',
    quantity: 1,
    weight: 1.1,
    is_fragile: false,
    goods_amount: 130.0,
    delivery_fee: 7.0,
    total_amount: 137.0,
    driver_name: 'Karim Mansouri',
    status: 'picked_up',
    notes: 'Colis ramassé à l’entrepôt - En cours d’acheminement',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

// ─── Local Cache Helpers ──────────────────────────────────────────────────────

function getLocalCache(): Parcel[] {
  try {
    const cached = localStorage.getItem(LOCAL_PARCELS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Parcel[];
      const existingTracking = new Set(parsed.map((p) => p.tracking_number));
      const missing = DEMO_PARCELS.filter((p) => !existingTracking.has(p.tracking_number));
      if (missing.length > 0) {
        const merged = [...parsed, ...missing];
        localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify(DEMO_PARCELS));
  return DEMO_PARCELS;
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

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('parcels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          parcels: getLocalCache(),
          source: 'cache',
          error: `Erreur Supabase : ${error.message}`,
        };
      }

      if (data && data.length > 0) {
        const mapped: Parcel[] = data.map((row) => ({
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
          goods_amount: Number(row.goods_amount) || 0,
          delivery_fee: Number(row.delivery_fee) || 7.0,
          total_amount: Number(row.total_amount) || (Number(row.goods_amount) + Number(row.delivery_fee)),
          driver_id: row.driver_id,
          driver_name: row.driver_name || '',
          status: (row.status as ParcelStatus) || 'pending',
          notes: row.notes || '',
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
        }));

        localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify(mapped));
        return { parcels: mapped, source: 'supabase', error: null };
      }
    } catch (err) {
      return {
        parcels: getLocalCache(),
        source: 'cache',
        error: `Impossible de joindre Supabase (${(err as Error).message})`,
      };
    }
  }

  return {
    parcels: getLocalCache(),
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

  const delivery_fee = calculateDeliveryFee(payload.recipient_governorate, payload.sender_name);
  const goods_amount = Number(payload.goods_amount || 0);
  const total_amount = goods_amount + delivery_fee;
  const tracking_number = `ZH${Math.floor(100000 + Math.random() * 900000)}`;

  const newParcel: Parcel = {
    id: `parcel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tracking_number,
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

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('parcels')
        .insert({
          tracking_number: newParcel.tracking_number,
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

      if (!error && data) {
        newParcel.id = data.id;
      }
    } catch {
      // Direct insert fallback
    }
  }

  // Update local cache
  const current = getLocalCache();
  localStorage.setItem(LOCAL_PARCELS_KEY, JSON.stringify([newParcel, ...current]));

  return { parcel: newParcel, error: null };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update parcel status, driver or fields in Supabase
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
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.driver_name !== undefined) updateData.driver_name = payload.driver_name;
      if (payload.recipient_name !== undefined) updateData.recipient_name = payload.recipient_name;
      if (payload.recipient_phone !== undefined) updateData.recipient_phone = payload.recipient_phone;
      if (payload.recipient_governorate !== undefined) {
        updateData.recipient_governorate = payload.recipient_governorate;
        updateData.delivery_fee = calculateDeliveryFee(payload.recipient_governorate);
      }
      if (payload.goods_amount !== undefined) updateData.goods_amount = payload.goods_amount;
      if (payload.notes !== undefined) updateData.notes = payload.notes;

      await client.from('parcels').update(updateData).eq('id', parcelId);
    } catch {
      // Fall through to local cache update
    }
  }

  // Update local cache
  const current = getLocalCache();
  const updated = current.map((p) => {
    if (p.id === parcelId || p.tracking_number === parcelId) {
      return { ...p, ...payload };
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
      name: parcel.sender_name || 'Boutique Express Mode',
      phone: parcel.sender_phone || '+216 71 888 999',
      address: parcel.sender_address || '12 Rue des Entrepreneurs, Charguia 2',
      city: 'Tunis',
      governorate: 'Tunis',
      postalCode: '2035',
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
