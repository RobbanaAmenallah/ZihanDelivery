import { type ClientPricingRule } from '@/types';

const LOCAL_CLIENT_PRICING_KEY = 'zihan_client_pricing_rules';

export const DEFAULT_PRICING_RULES: ClientPricingRule[] = [
  {
    id: 'pr-001',
    client_name: 'Boutique Express Mode',
    company_name: 'Boutique Express Mode SARL',
    flat_rate: 8.0,
    custom_note: 'Convention ZIHAN — tarif unique toute Tunisie',
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pr-002',
    client_name: 'Tech Express TN',
    company_name: 'Tech Express TN',
    flat_rate: 9.0,
    custom_note: 'Électronique — tarif négocié',
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pr-003',
    client_name: 'Parfumerie Alyssa',
    company_name: 'Alyssa Parfums & Cosmétiques',
    flat_rate: 7.0,
    custom_note: 'Remise grand volume (>100 colis/mois)',
    is_active: true,
    updated_at: new Date().toISOString(),
  },
];

// Helper to get local cache
export function getLocalClientPricing(): ClientPricingRule[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLIENT_PRICING_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CLIENT_PRICING_KEY, JSON.stringify(DEFAULT_PRICING_RULES));
      return DEFAULT_PRICING_RULES;
    }
    return JSON.parse(raw) as ClientPricingRule[];
  } catch {
    return DEFAULT_PRICING_RULES;
  }
}

// Helper to save local cache
export function saveLocalClientPricing(rules: ClientPricingRule[]): void {
  try {
    localStorage.setItem(LOCAL_CLIENT_PRICING_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Failed to save client pricing rules locally:', err);
  }
}

/**
 * Get pricing rule for a specific client by name or company name.
 * Returns null if no active rule found (will use default 8 DT).
 */
export function getClientPricingRule(clientNameOrCompany?: string): ClientPricingRule | null {
  if (!clientNameOrCompany) return null;
  const rules = getLocalClientPricing();
  const search = clientNameOrCompany.trim().toLowerCase();

  return (
    rules.find(
      (r) =>
        r.is_active &&
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
    return customRule.flat_rate;
  }
  return 8.0; // Tarif par défaut ZIHAN
}

/**
 * Update or insert a pricing rule for a client
 */
export async function saveClientPricingRule(
  ruleData: Omit<ClientPricingRule, 'id' | 'updated_at'> & { id?: string }
): Promise<ClientPricingRule> {
  const current = getLocalClientPricing();
  const id = ruleData.id || `pr-${Date.now()}`;
  const now = new Date().toISOString();

  const rule: ClientPricingRule = {
    ...ruleData,
    id,
    updated_at: now,
  };

  const existingIndex = current.findIndex(
    (r) => r.id === id || r.client_name.toLowerCase() === rule.client_name.toLowerCase()
  );

  let updated: ClientPricingRule[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = rule;
  } else {
    updated = [rule, ...current];
  }

  saveLocalClientPricing(updated);
  return rule;
}

/**
 * Delete a custom pricing rule (reverts client to default ZIHAN tariff)
 */
export async function deleteClientPricingRule(id: string): Promise<void> {
  const current = getLocalClientPricing();
  const updated = current.filter((r) => r.id !== id);
  saveLocalClientPricing(updated);
}
