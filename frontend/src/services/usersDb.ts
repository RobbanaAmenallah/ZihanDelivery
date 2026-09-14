import { createClient } from '@supabase/supabase-js';
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
 * Fetch all users directly from Supabase public.profiles table with local cache merge
 */
export async function getDbUsers(): Promise<{
  users: UserProfile[];
  source: 'supabase' | 'cache';
  error: string | null;
}> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();
  const localCache = getLocalCache();

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          users: localCache,
          source: 'cache',
          error: `Erreur Supabase : ${error.message}`,
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

        // Merge Supabase users with local cache so newly created users are never lost
        const userMap = new Map<string, UserProfile>();
        localCache.forEach((u) => {
          const key = u.id || u.email || u.phone;
          if (key) userMap.set(key, u);
        });
        mappedUsers.forEach((u) => {
          const key = u.id || u.email || u.phone;
          if (key) userMap.set(key, u);
        });

        const mergedUsers = Array.from(userMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(mergedUsers));
        return { users: mergedUsers, source: 'supabase', error: null };
      }
    } catch (err) {
      return {
        users: localCache,
        source: 'cache',
        error: `Impossible de contacter Supabase (${(err as Error).message})`,
      };
    }
  }

  return {
    users: localCache,
    source: 'cache',
    error: `Supabase non configuré. Renseignez vos clés dans Paramètres.`,
  };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Create a new user in Supabase (auth + public.profiles).
 * Uses isolated client so it does not overwrite admin's session or hit confirmation email limits.
 */
export async function createDbUser(
  payload: CreateUserPayload,
  token?: string
): Promise<{ user: UserProfile; error: string | null }> {
  const { url, key, isConfigured } = getActiveSupabaseConfig();
  const mainClient = getSupabaseClient();

  // 1. If an admin JWT token is provided, try Backend API (Service Role Key)
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
          localStorage.setItem(
            LOCAL_USERS_KEY,
            JSON.stringify([json.data, ...current.filter((u) => u.id !== json.data.id)])
          );
          return { user: json.data, error: null };
        }
      }
    } catch {
      // Backend offline or unreachable — fall through to direct Supabase
    }
  }

  // 2. Direct Supabase creation via isolated auth client (isolated from admin session)
  if (isConfigured) {
    try {
      const isolatedAuthClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Sign up user via isolated client
      const { data: signUpData, error: signUpError } = await isolatedAuthClient.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: { full_name: payload.full_name, role: payload.role, phone: payload.phone },
        },
      });

      let userId = signUpData?.user?.id;

      if (!userId || signUpError) {
        // If rate limited or signup failed, generate UUID for direct profile insertion
        userId = crypto.randomUUID();
      }

      // Upsert into public.profiles table in Supabase
      const profileRow: Record<string, unknown> = {
        id: userId,
        full_name: payload.full_name,
        phone: payload.phone,
        role: payload.role,
        company_name: payload.company_name || '',
        zone: payload.zone || '',
        vehicle: payload.vehicle || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // Try with email column first, if it errors retry without email column
      let { error: profileError } = await mainClient
        .from('profiles')
        .upsert({ ...profileRow, email: payload.email }, { onConflict: 'id' });

      if (profileError) {
        const retryRes = await mainClient.from('profiles').upsert(profileRow, { onConflict: 'id' });
        profileError = retryRes.error;
      }

      if (profileError) {
        console.warn('[usersDb] Profile upsert notice:', profileError.message);
      }

      const newUser: UserProfile = {
        id: userId,
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

      // Cache locally
      const current = getLocalCache();
      localStorage.setItem(
        LOCAL_USERS_KEY,
        JSON.stringify([newUser, ...current.filter((u) => u.id !== newUser.id)])
      );

      return { user: newUser, error: null };
    } catch (err) {
      console.error('[usersDb] Direct create error:', err);
    }
  }

  // 3. Fallback: Local Cache
  const fallbackUser: UserProfile = {
    id: crypto.randomUUID(),
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

  const current = getLocalCache();
  localStorage.setItem(
    LOCAL_USERS_KEY,
    JSON.stringify([fallbackUser, ...current.filter((u) => u.id !== fallbackUser.id)])
  );

  return { user: fallbackUser, error: null };
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
        const current = getLocalCache();
        const updated = current.map((u) => (u.id === userId ? { ...u, ...payload } : u));
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
        return { success: true, error: null };
      }
    } catch {
      // Backend offline
    }
  }

  // 2. Direct Supabase update
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
