import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import { type CompanyExpense, type CreateExpensePayload, type UpdateExpensePayload, type ExpenseCategory } from '@/types';

const LOCAL_EXPENSES_KEY = 'zihan_company_expenses';

export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  icon: string;
  badgeClass: string;
  borderClass: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  {
    key: 'gasoil',
    label: 'Gasoil & Carburant',
    icon: '⛽',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
    borderClass: 'border-l-amber-500',
  },
  {
    key: 'vidange',
    label: 'Vidange & Filtres',
    icon: '🛢️',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
    borderClass: 'border-l-blue-500',
  },
  {
    key: 'pieces_rechange',
    label: 'Pièces de Rechange',
    icon: '⚙️',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
    borderClass: 'border-l-purple-500',
  },
  {
    key: 'entretien',
    label: 'Entretien & Réparation',
    icon: '🔧',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300',
    borderClass: 'border-l-orange-500',
  },
  {
    key: 'facture_tel',
    label: 'Facture Téléphonique / Internet',
    icon: '📱',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
    borderClass: 'border-l-emerald-500',
  },
  {
    key: 'assurance_vignette',
    label: 'Assurance, Vignette & Visite',
    icon: '📄',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300',
    borderClass: 'border-l-indigo-500',
  },
  {
    key: 'salaire_prime',
    label: 'Salaires & Primes Livreurs',
    icon: '💼',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300',
    borderClass: 'border-l-teal-500',
  },
  {
    key: 'loyer_charges',
    label: 'Loyer Dépôt & Charges',
    icon: '🏢',
    badgeClass: 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    borderClass: 'border-l-slate-500',
  },
  {
    key: 'autre',
    label: 'Autre Dépense',
    icon: '💳',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
    borderClass: 'border-l-rose-500',
  },
];

export const COMPANY_VEHICLES: { plate: string; model: string; driver?: string }[] = [];

export const INITIAL_SAMPLE_EXPENSES: CompanyExpense[] = [];

// ─── Local Cache Helpers ──────────────────────────────────────────────────────

function getLocalExpenses(): CompanyExpense[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXPENSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Nettoyer définitivement les éventuelles lignes d'exemple factices
        const sampleIds = ['exp_1', 'exp_2', 'exp_3', 'exp_4', 'exp_5', 'exp_6'];
        const realOnly = parsed.filter(
          (e: CompanyExpense) => !sampleIds.includes(e.id) && !e.id?.startsWith('exp_sample_')
        );
        if (realOnly.length !== parsed.length) {
          localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(realOnly));
        }
        return realOnly;
      }
    }
  } catch { /* ignore */ }

  return [];
}

function saveLocalExpenses(expenses: CompanyExpense[]) {
  try {
    // Filtrer pour garantir qu'aucune donnée factice n'est stockée
    const sampleIds = ['exp_1', 'exp_2', 'exp_3', 'exp_4', 'exp_5', 'exp_6'];
    const clean = expenses.filter((e) => !sampleIds.includes(e.id) && !e.id?.startsWith('exp_sample_'));
    localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(clean));
  } catch { /* ignore */ }
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getDbExpenses(): Promise<{
  expenses: CompanyExpense[];
  source: 'supabase' | 'cache';
  error: string | null;
}> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();
  const local = getLocalExpenses();

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: CompanyExpense[] = data.map((row) => ({
          id: row.id,
          category: (row.category as ExpenseCategory) || 'autre',
          title: row.title || 'Dépense',
          amount: Number(row.amount) || 0,
          date: row.date || new Date().toISOString().split('T')[0],
          vehicle_plate: row.vehicle_plate || '',
          vehicle_model: row.vehicle_model || '',
          driver_name: row.driver_name || '',
          mileage: row.mileage ? Number(row.mileage) : undefined,
          payment_method: row.payment_method || 'especes',
          receipt_number: row.receipt_number || '',
          supplier: row.supplier || '',
          notes: row.notes || '',
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));

        saveLocalExpenses(mapped);
        return { expenses: mapped, source: 'supabase', error: null };
      }
    } catch {
      // Fallback to cache seamlessly
    }
  }

  return { expenses: local, source: 'cache', error: null };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createDbExpense(
  payload: CreateExpensePayload
): Promise<{ expense: CompanyExpense; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  const newExpense: CompanyExpense = {
    ...payload,
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('expenses')
        .insert({
          category: newExpense.category,
          title: newExpense.title,
          amount: newExpense.amount,
          date: newExpense.date,
          vehicle_plate: newExpense.vehicle_plate || null,
          vehicle_model: newExpense.vehicle_model || null,
          driver_name: newExpense.driver_name || null,
          mileage: newExpense.mileage || null,
          payment_method: newExpense.payment_method,
          receipt_number: newExpense.receipt_number || null,
          supplier: newExpense.supplier || null,
          notes: newExpense.notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        newExpense.id = data.id;
      }
    } catch {
      // Local fallback handled below
    }
  }

  const current = getLocalExpenses();
  const updated = [newExpense, ...current];
  saveLocalExpenses(updated);

  return { expense: newExpense, error: null };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateDbExpense(
  expenseId: string,
  payload: UpdateExpensePayload
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  if (isConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expenseId);
      if (isUuid) {
        await client
          .from('expenses')
          .update({
            ...payload,
            updated_at: now,
          })
          .eq('id', expenseId);
      }
    } catch {
      // Local cache handles update
    }
  }

  const current = getLocalExpenses();
  const updated = current.map((e) =>
    e.id === expenseId ? { ...e, ...payload, updated_at: now } : e
  );
  saveLocalExpenses(updated);

  return { success: true, error: null };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteDbExpense(
  expenseId: string
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expenseId);
      if (isUuid) {
        await client.from('expenses').delete().eq('id', expenseId);
      }
    } catch {
      // Local cache handles delete
    }
  }

  const current = getLocalExpenses();
  const updated = current.filter((e) => e.id !== expenseId);
  saveLocalExpenses(updated);

  return { success: true, error: null };
}
