import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import { type UserProfile, type CreateUserPayload, type UpdateUserPayload } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const LOCAL_USERS_KEY = 'zihan_managed_users';

export interface DbStatus {
  isConnected: boolean;
  isRealtimeActive: boolean;
  provider: 'supabase' | 'local_fallback';
  lastSync: Date | null;
  totalRows: number;
  errorMessage?: string | null;
  supabaseUrl?: string;
}

// ─── Local Cache Helpers ──────────────────────────────────────────────────────

function getLocalCache(): UserProfile[] {
  try {
    const cached = localStorage.getItem(LOCAL_USERS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as UserProfile[];
      const clean = parsed.filter(
        (u) =>
          u.email !== 'admin@zihan.tn' &&
          u.email !== 'livreur@zihan.tn' &&
          u.email !== 'client@zihan.tn'
      );
      if (clean.length !== parsed.length) {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(clean));
      }
      return clean;
    }
  } catch { /* ignore */ }
  return [];
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all users directly from Supabase public.profiles table
 */
export async function getDbUsers(): Promise<{
  users: UserProfile[];
  source: 'supabase' | 'cache';
  error: string | null;
}> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          users: getLocalCache(),
          source: 'cache',
          error: `Erreur Supabase : ${error.message} (Code: ${error.code || 'RLS'})`,
        };
      }

      if (data) {
        const mappedUsers: UserProfile[] = data.map((row) => ({
          id: row.id,
          full_name: row.full_name || 'Utilisateur',
          phone: row.phone || '',
          role: row.role || 'client',
          company_name: row.company_name || '',
          zone: row.zone || '',
          vehicle: row.vehicle || '',
          is_active: row.is_active ?? true,
          created_at: row.created_at || new Date().toISOString(),
          created_by: row.created_by || null,
          email: row.email || '',
        }));

        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(mappedUsers));
        return { users: mappedUsers, source: 'supabase', error: null };
      }
    } catch (err) {
      return {
        users: getLocalCache(),
        source: 'cache',
        error: `Impossible de contacter Supabase (${(err as Error).message})`,
      };
    }
  }

  return {
    users: getLocalCache(),
    source: 'cache',
    error: `Supabase non configuré. Cliquez sur "Connecter Supabase" et renseignez vos clés.`,
  };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Create a new user via backend API (Service Role Key) or Supabase signUp fallback.
 * The ID is ALWAYS a real UUID — no fake string IDs.
 */
export async function createDbUser(
  payload: CreateUserPayload,
  token?: string
): Promise<{ user: UserProfile; error: string | null }> {
  const client = getSupabaseClient();

  // 1. If an admin JWT token is provided, try Backend API (creates auth.users + profiles via Service Role Key)
  if (token) {
    try {
      const backendRes = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (backendRes.ok) {
        const json = await backendRes.json();
        if (json.data) {
          const current = getLocalCache();
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([json.data, ...current.filter((u) => u.id !== json.data.id)]));
          return { user: json.data, error: null };
        }
      } else if (backendRes.status === 400) {
        const errJson = await backendRes.json();
        return {
          user: {} as UserProfile,
          error: errJson.message || 'Données invalides pour la création.',
        };
      }
      // If 401/403 or other status, fall through to direct Supabase Auth signUp
    } catch {
      // Backend unreachable — fall through to direct Supabase Auth signUp
    }
  }

  // 2. Direct Supabase Auth signUp (generates a real UUID automatically)
  try {
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: { full_name: payload.full_name, role: payload.role, phone: payload.phone },
      },
    });

    if (signUpError) {
      return {
        user: {} as UserProfile,
        error: signUpError.message.includes('already registered')
          ? `L'adresse email ${payload.email} est déjà utilisée.`
          : `Erreur création compte Supabase : ${signUpError.message}`,
      };
    }

    if (!signUpData.user) {
      return { user: {} as UserProfile, error: 'Erreur : compte non créé par Supabase.' };
    }

    const realUuid = signUpData.user.id;

    // Insert profile using the real UUID from auth
    const { error: profileError } = await client.from('profiles').upsert({
      id: realUuid,
      full_name: payload.full_name,
      phone: payload.phone,
      role: payload.role,
      company_name: payload.company_name || '',
      zone: payload.zone || '',
      vehicle: payload.vehicle || '',
      is_active: true,
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileError) {
      console.warn('[usersDb] Profile upsert after signUp:', profileError.message);
    }

    const newUser: UserProfile = {
      id: realUuid,
      email: payload.email,
      full_name: payload.full_name,
      phone: payload.phone,
      role: payload.role,
      company_name: payload.company_name || '',
      zone: payload.zone || '',
      vehicle: payload.vehicle || '',
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: null,
    };

    // Save to local cache
    const current = getLocalCache();
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([newUser, ...current.filter((u) => u.id !== newUser.id)]));

    return { user: newUser, error: null };
  } catch (err) {
    return {
      user: {} as UserProfile,
      error: `Erreur lors de la création : ${(err as Error).message}`,
    };
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update user in Supabase public.profiles
 */
export async function updateDbUser(
  userId: string,
  payload: UpdateUserPayload,
  token?: string
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  // 1. Try Backend API (bypasses RLS with Service Role Key)
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Also update cache
        const current = getLocalCache();
        const updated = current.map((u) => (u.id === userId ? { ...u, ...payload } : u));
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
        return { success: true, error: null };
      }
    } catch {
      // Backend offline — try direct Supabase
    }
  }

  // 2. Direct Supabase update (requires RLS to allow it)
  if (isConfigured) {
    const updateData: Record<string, unknown> = {};
    if (payload.full_name !== undefined) updateData.full_name = payload.full_name;
    if (payload.phone !== undefined) updateData.phone = payload.phone;
    if (payload.company_name !== undefined) updateData.company_name = payload.company_name;
    if (payload.zone !== undefined) updateData.zone = payload.zone;
    if (payload.vehicle !== undefined) updateData.vehicle = payload.vehicle;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    try {
      const { error } = await client.from('profiles').update(updateData).eq('id', userId);
      if (error) {
        return { success: false, error: `Erreur modification Supabase : ${error.message}` };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // Update local cache regardless
  const current = getLocalCache();
  const updated = current.map((u) => (u.id === userId ? { ...u, ...payload } : u));
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));

  return { success: true, error: null };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Delete user from Supabase public.profiles & auth
 */
export async function deleteDbUser(
  userId: string,
  token?: string
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  // 1. Try Backend API
  if (token) {
    try {
      await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch { /* Backend offline */ }
  }

  // 2. Direct Supabase delete
  if (isConfigured) {
    try {
      const { error } = await client.from('profiles').delete().eq('id', userId);
      if (error) {
        return { success: false, error: `Erreur suppression Supabase : ${error.message}` };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // Update local cache
  const current = getLocalCache();
  const filtered = current.filter((u) => u.id !== userId);
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));

  return { success: true, error: null };
}
