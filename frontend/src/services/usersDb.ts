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
 *
 * Priority:
 *  1. Backend API (Service Role Key — bypasses rate limits completely) ✅ Preferred
 *  2. Direct Supabase signUp via isolated client (may hit 429 rate limit)
 *  3. Local-only cache fallback if everything fails
 */
export async function createDbUser(
  payload: CreateUserPayload,
  token?: string
): Promise<{ user: UserProfile; error: string | null }> {
  const { url, key, isConfigured } = getActiveSupabaseConfig();
  const mainClient = getSupabaseClient();

  // ── 1. BACKEND API (Service Role Key — no rate limits) ────────────────────
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
          const userFromBackend: UserProfile = {
            id: json.data.id,
            email: json.data.email || payload.email,
            full_name: json.data.full_name || payload.full_name,
            phone: json.data.phone || payload.phone,
            role: json.data.role || payload.role,
            company_name: json.data.company_name || payload.company_name || '',
            zone: json.data.zone || payload.zone || '',
            vehicle: json.data.vehicle || payload.vehicle || '',
            is_active: json.data.is_active ?? true,
            created_at: json.data.created_at || new Date().toISOString(),
            created_by: null,
          };
          const current = getLocalCache();
          localStorage.setItem(
            LOCAL_USERS_KEY,
            JSON.stringify([userFromBackend, ...current.filter((u) => u.id !== userFromBackend.id)])
          );
          return { user: userFromBackend, error: null };
        }
      }

      // Backend returned an error response — read it and report
      try {
        const errJson = await backendRes.json();
        const errMsg = errJson.message || `Erreur backend (${backendRes.status})`;
        // Don't fall through to signUp for business errors like "email already in use"
        if (backendRes.status === 400) {
          const localUser: UserProfile = {
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
          return { user: localUser, error: errMsg };
        }
      } catch { /* ignore json parse error */ }
    } catch {
      // Backend offline or network error — fall through to direct Supabase
      console.warn('[usersDb] Backend unreachable, falling back to direct Supabase');
    }
  }

  // ── 2. DIRECT SUPABASE — only if backend is unavailable ───────────────────
  if (isConfigured) {
    try {
      let authUserId: string | null = null;
      let isRateLimited = false;

      // Try signUp via isolated client
      try {
        const isolatedAuthClient = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: signUpData, error: signUpError } = await isolatedAuthClient.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            data: { full_name: payload.full_name, role: payload.role, phone: payload.phone },
          },
        });

        if (signUpData?.user?.id) {
          authUserId = signUpData.user.id;
        } else if (
          signUpError?.status === 429 ||
          signUpError?.message?.includes('rate limit') ||
          signUpError?.message?.includes('Too Many')
        ) {
          isRateLimited = true;
        }
      } catch (authErr) {
        console.warn('[usersDb] Auth signUp notice:', authErr);
      }

      // If auth was rate-limited or didn't return an ID, generate a unique profile UUID
      const finalUserId = authUserId || crypto.randomUUID();

      const profileRow: Record<string, unknown> = {
        id: finalUserId,
        email: payload.email,
        full_name: payload.full_name,
        phone: payload.phone,
        role: payload.role,
        company_name: payload.company_name || '',
        zone: payload.zone || '',
        vehicle: payload.vehicle || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // Upsert into public.profiles table in Supabase
      let profileError: any = null;
      try {
        const res = await mainClient
          .from('profiles')
          .upsert(profileRow, { onConflict: 'id' });
        profileError = res.error;

        // If error might be due to email column not yet added, try without email
        if (profileError && profileError.message?.includes('column "email"')) {
          const { email, ...rowWithoutEmail } = profileRow;
          const retryRes = await mainClient
            .from('profiles')
            .upsert(rowWithoutEmail, { onConflict: 'id' });
          profileError = retryRes.error;
        }
      } catch (dbErr) {
        profileError = dbErr;
      }

      const newUser: UserProfile = {
        id: finalUserId,
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

      // Always save in local cache for immediate display
      const current = getLocalCache();
      localStorage.setItem(
        LOCAL_USERS_KEY,
        JSON.stringify([newUser, ...current.filter((u) => u.id !== newUser.id)])
      );

      if (profileError) {
        console.warn('[usersDb] Profile DB save notice:', profileError.message || profileError);
        return {
          user: newUser,
          error: `⚠️ Enregistré localement. Pour enregistrer dans Supabase sans limite horaire, exécutez le script SQL (enable_realtime_and_fix_sync.sql) dans votre dashboard Supabase.`,
        };
      }

      // Success in Supabase DB!
      return {
        user: newUser,
        error: isRateLimited
          ? `⚠️ Utilisateur enregistré dans Supabase (Profil créé directement sans compte Auth dû à la limite horaire Supabase).`
          : null,
      };
    } catch (err) {
      console.error('[usersDb] Direct create exception:', err);
    }
  }

  // ── 3. LOCAL-ONLY FALLBACK ────────────────────────────────────────────────
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
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([fallbackUser, ...current.filter((u) => u.id !== fallbackUser.id)]));
  return {
    user: fallbackUser,
    error: 'Supabase non disponible. Utilisateur sauvegardé localement uniquement.',
  };
}


// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update user in Supabase public.profiles & auth.users
 */
export async function updateDbUser(
  userId: string,
  payload: UpdateUserPayload,
  token?: string
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  // 1. If email is being changed, update in Auth & Profiles via Supabase RPC
  if (isConfigured && payload.email) {
    try {
      const { error: rpcError } = await client.rpc('update_user_email_by_admin', {
        target_user_id: userId,
        new_email: payload.email.trim().toLowerCase(),
      });
      if (rpcError && !rpcError.message?.includes('function') && !rpcError.message?.includes('does not exist')) {
        return { success: false, error: rpcError.message };
      }
    } catch {
      // RPC might not exist yet, fallback to backend or direct update
    }
  }

  // 2. Try Backend API (uses Service Role Key to update auth.users and public.profiles)
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
      } else {
        try {
          const errData = await res.json();
          if (errData.message) {
            return { success: false, error: errData.message };
          }
        } catch { /* ignore */ }
      }
    } catch {
      // Backend offline
    }
  }

  // 3. Direct Supabase update on public.profiles
  if (isConfigured) {
    const updateData: Record<string, unknown> = {};
    if (payload.email !== undefined) updateData.email = payload.email.trim().toLowerCase();
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
 * Delete user completely from Supabase (auth.users & public.profiles).
 * 1. Tries Supabase RPC `delete_user_by_admin` (deletes from auth.users and profiles directly)
 * 2. Tries backend admin API (`DELETE /api/admin/users/:id`)
 * 3. Fallback direct profile delete + local cache purge
 */
export async function deleteDbUser(
  userId: string,
  token?: string
): Promise<{ success: boolean; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  // 1. Try Supabase RPC delete_user_by_admin (Deletes auth.users + public.profiles directly)
  if (isConfigured) {
    try {
      const { error: rpcError } = await client.rpc('delete_user_by_admin', {
        target_user_id: userId,
      });

      if (!rpcError) {
        const current = getLocalCache();
        const filtered = current.filter((u) => u.id !== userId);
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
        return { success: true, error: null };
      }
    } catch {
      // RPC not yet configured in DB, proceed to next strategies
    }
  }

  // 2. Try Backend API (uses Supabase Service Role to delete from auth.users + public.profiles)
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const current = getLocalCache();
        const filtered = current.filter((u) => u.id !== userId);
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
        return { success: true, error: null };
      }
    } catch {
      // Backend offline
    }
  }

  // 3. Direct Supabase delete from public.profiles
  if (isConfigured) {
    try {
      // Detach parcels first
      await client.from('parcels').update({ driver_id: null }).eq('driver_id', userId);
      await client.from('parcels').update({ sender_id: null }).eq('sender_id', userId);

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
// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

export const STANDARD_PASSWORD_LABEL = 'Password123!';

/**
 * Reset a user's password to the standard password via backend API.
 * Uses Service Role Key — works regardless of user's current password.
 */
export async function resetDbUserPassword(
  userId: string,
  token?: string,
): Promise<{ success: boolean; error: string | null }> {
  // Backend API (Service Role Key — direct password update, no email needed)
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        return { success: true, error: null };
      }

      try {
        const errData = await res.json();
        return { success: false, error: errData.message || `Erreur (${res.status})` };
      } catch {
        return { success: false, error: `Erreur serveur (${res.status})` };
      }
    } catch {
      return { success: false, error: 'Backend inaccessible — mot de passe non réinitialisé.' };
    }
  }

  return { success: false, error: 'Token admin requis pour réinitialiser le mot de passe.' };
}
