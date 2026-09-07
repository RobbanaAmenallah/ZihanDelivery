import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/constants';

let supabaseInstance: SupabaseClient | null = null;

export function getActiveSupabaseConfig(): { url: string; key: string; isConfigured: boolean } {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('zihan_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('zihan_supabase_key') : null;

  const url = (customUrl || SUPABASE_URL || '').trim();
  const key = (customKey || SUPABASE_ANON_KEY || '').trim();
  const isConfigured = Boolean(url && key && !url.includes('placeholder'));

  return { url, key, isConfigured };
}

/**
 * Get or initialize the Supabase client.
 */
export function getSupabaseClient(forceNew = false): SupabaseClient {
  if (!supabaseInstance || forceNew) {
    const { url, key } = getActiveSupabaseConfig();
    const effectiveUrl = url || 'https://placeholder.supabase.co';
    const effectiveKey = key || 'placeholder-anon-key';

    supabaseInstance = createClient(effectiveUrl, effectiveKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

export function saveSupabaseConfig(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('zihan_supabase_url', url.trim());
    localStorage.setItem('zihan_supabase_key', key.trim());
    supabaseInstance = null; // force re-create next time
  }
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zihan_supabase_url');
    localStorage.removeItem('zihan_supabase_key');
    supabaseInstance = null;
  }
}

export const supabase = getSupabaseClient();
