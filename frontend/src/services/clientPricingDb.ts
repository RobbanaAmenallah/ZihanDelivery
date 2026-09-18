import { type ClientPricingRule } from '@/types';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';

const LOCAL_CLIENT_PRICING_KEY = 'zihan_client_pricing_rules';

export const DEFAULT_PRICING_RULES: ClientPricingRule[] = [];

// ─── Local Cache Helpers ──────────────────────────────────────────────────────

export function getLocalClientPricing(): ClientPricingRule[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLIENT_PRICING_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ClientPricingRule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalClientPricing(rules: ClientPricingRule[]): void {
  try {
    localStorage.setItem(LOCAL_CLIENT_PRICING_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Failed to save client pricing rules locally:', err);
  }
}

// ─── READ FROM SUPABASE & CACHE ───────────────────────────────────────────────

/**
 * Fetch all client pricing rules from Supabase `client_pricing_rules` table
 * with seamless local cache fallback and automatic synchronization.
 */
export async function getDbClientPricing(): Promise<{
  rules: ClientPricingRule[];
  source: 'supabase' | 'cache';
  error: string | null;
}> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();
  const localCache = getLocalClientPricing();

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('client_pricing_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch client_pricing_rules error:', error);
        return {
          rules: localCache,
          source: 'cache',
          error: `Erreur Supabase : ${error.message}`,
        };
      }

      if (data) {
        const mapped: ClientPricingRule[] = data.map((row) => ({
          id: row.id,
          client_id: row.client_id || undefined,
          client_name: row.client_name || '',
          company_name: row.company_name || row.client_name || '',
          flat_rate: Number(row.flat_rate) || 8.0,
          custom_note: row.custom_note || '',
          is_active: row.is_active !== false,
          updated_at: row.updated_at || row.created_at || new Date().toISOString(),
        }));

        saveLocalClientPricing(mapped);
        return { rules: mapped, source: 'supabase', error: null };
      }
    } catch (err) {
      return {
        rules: localCache,
        source: 'cache',
        error: `Impossible de joindre Supabase (${(err as Error).message})`,
      };
    }
  }

  return {
    rules: localCache,
    source: 'cache',
    error: null,
  };
}

// ─── GET RULE FOR CLIENT (CALCULATION) ─────────────────────────────────────────

/**
 * Get pricing rule for a specific client by name, company name, or client ID.
 * Returns null if no active rule found (default 8 DT will apply).
 */
export function getClientPricingRule(clientNameOrCompany?: string): ClientPricingRule | null {
  if (!clientNameOrCompany) return null;
  const rules = getLocalClientPricing();
  const search = clientNameOrCompany.trim().toLowerCase();

  return (
    rules.find(
      (r) =>
        r.is_active !== false &&
        (r.client_name.trim().toLowerCase() === search ||
          r.company_name.trim().toLowerCase() === search ||
          (r.client_id && r.client_id === clientNameOrCompany))
    ) || null
  );
}

/**
 * Return the flat delivery fee for a client — same rate for ALL Tunisia.
 * Default fallback: 8.000 DT if no custom rule.
 */
export function calculateFlatDeliveryFee(clientNameOrCompany?: string): number {
  const customRule = getClientPricingRule(clientNameOrCompany);
  if (customRule) {
    return Number(customRule.flat_rate);
  }
  return 8.0; // Tarif standard ZIHAN
}

// ─── CREATE / UPDATE RULE IN SUPABASE ─────────────────────────────────────────

/**
 * Update or insert a pricing rule for a client in Supabase and local cache.
 */
export async function saveClientPricingRule(
  ruleData: Omit<ClientPricingRule, 'id' | 'updated_at'> & { id?: string; client_id?: string }
): Promise<{ rule: ClientPricingRule; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  let generatedId = ruleData.id || `pr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let dbError: string | null = null;

  const ruleToSave: ClientPricingRule = {
    id: generatedId,
    client_id: ruleData.client_id,
    client_name: ruleData.client_name.trim(),
    company_name: (ruleData.company_name || ruleData.client_name).trim(),
    flat_rate: Number(ruleData.flat_rate),
    custom_note: ruleData.custom_note?.trim() || '',
    is_active: ruleData.is_active !== false,
    updated_at: now,
  };

  if (isConfigured) {
    try {
      const payload = {
        client_id: ruleToSave.client_id || null,
        client_name: ruleToSave.client_name,
        company_name: ruleToSave.company_name,
        flat_rate: ruleToSave.flat_rate,
        custom_note: ruleToSave.custom_note,
        is_active: ruleToSave.is_active,
        updated_at: now,
      };

      if (ruleData.id && !ruleData.id.startsWith('pr_')) {
        // Update existing UUID record
        const { data, error } = await client
          .from('client_pricing_rules')
          .update(payload)
          .eq('id', ruleData.id)
          .select()
          .single();

        if (error) {
          dbError = error.message;
        } else if (data) {
          generatedId = data.id;
          ruleToSave.id = data.id;
        }
      } else {
        // Insert new record
        const { data, error } = await client
          .from('client_pricing_rules')
          .insert(payload)
          .select()
          .single();

        if (error) {
          dbError = error.message;
        } else if (data) {
          generatedId = data.id;
          ruleToSave.id = data.id;
        }
      }
    } catch (err) {
      dbError = (err as Error).message;
    }
  }

  // Update local cache
  const current = getLocalClientPricing();
  const existingIndex = current.findIndex(
    (r) =>
      r.id === ruleToSave.id ||
      r.client_name.toLowerCase() === ruleToSave.client_name.toLowerCase() ||
      (ruleToSave.client_id && r.client_id === ruleToSave.client_id)
  );

  let updatedCache: ClientPricingRule[];
  if (existingIndex >= 0) {
    updatedCache = [...current];
    updatedCache[existingIndex] = ruleToSave;
  } else {
    updatedCache = [ruleToSave, ...current];
  }

  saveLocalClientPricing(updatedCache);
  return { rule: ruleToSave, error: dbError };
}

// ─── DELETE RULE FROM SUPABASE ────────────────────────────────────────────────

/**
 * Delete a custom pricing rule from Supabase and cache (reverts client to default ZIHAN tariff)
 */
export async function deleteClientPricingRule(id: string): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();
  let dbError: string | null = null;

  if (isConfigured && !id.startsWith('pr_')) {
    try {
      const { error } = await client.from('client_pricing_rules').delete().eq('id', id);
      if (error) {
        dbError = error.message;
      }
    } catch (err) {
      dbError = (err as Error).message;
    }
  }

  const current = getLocalClientPricing();
  const updated = current.filter((r) => r.id !== id);
  saveLocalClientPricing(updated);

  return { success: !dbError, error: dbError };
}

