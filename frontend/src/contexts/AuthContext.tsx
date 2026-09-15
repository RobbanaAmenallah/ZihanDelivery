import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { type User, type Session, type AuthError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { type UserProfile, type UserRole } from '@/types';
import { SUPABASE_URL } from '@/lib/constants';

// ─── Context Shape ────────────────────────────────────────────────────────────

export interface SignInResult {
  error: AuthError | Error | null;
  role: UserRole;
  user: User | null;
  profile: UserProfile | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  isProfileLoading: boolean;

  signIn: (email: string, password: string) => Promise<SignInResult>;
  // kept for API compatibility but does nothing useful without demo profiles
  loginAsDemo: (role?: UserRole) => UserRole;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Helper to infer role ─────────────────────────────────────────────────────

function resolveRole(user: User | null, profile: UserProfile | null): UserRole {
  if (profile?.role) return profile.role as UserRole;
  if (user?.user_metadata?.role) return user.user_metadata.role as UserRole;
  return 'client';
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  // ── Fetch profile from public.profiles ──────────────────────────────────────
  const fetchProfile = useCallback(async (targetUser: User): Promise<UserProfile | null> => {
    setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUser.id)
        .maybeSingle();

      if (!error && data) {
        const loaded: UserProfile = {
          id: data.id,
          email: data.email || targetUser.email || '',
          full_name: data.full_name || (targetUser.user_metadata?.full_name as string) || 'Utilisateur',
          phone: data.phone || (targetUser.user_metadata?.phone as string) || '',
          role: data.role || (targetUser.user_metadata?.role as UserRole) || 'client',
          company_name: data.company_name || (targetUser.user_metadata?.company_name as string) || '',
          zone: data.zone || (targetUser.user_metadata?.zone as string) || '',
          vehicle: data.vehicle || (targetUser.user_metadata?.vehicle as string) || '',
          is_active: data.is_active !== false, // Active by default unless explicitly false
          created_at: data.created_at || targetUser.created_at || new Date().toISOString(),
          created_by: data.created_by || null,
        };
        setProfile(loaded);
        setIsProfileLoading(false);
        return loaded;
      }

      // If row not yet in public.profiles, create it seamlessly
      const fallbackRole = resolveRole(targetUser, null);
      const fallbackProfile: UserProfile = {
        id: targetUser.id,
        email: targetUser.email ?? '',
        full_name: (targetUser.user_metadata?.full_name as string) || (targetUser.email?.split('@')[0] ?? 'Utilisateur'),
        phone: (targetUser.user_metadata?.phone as string) || '',
        role: fallbackRole,
        company_name: (targetUser.user_metadata?.company_name as string) || '',
        zone: (targetUser.user_metadata?.zone as string) || '',
        vehicle: (targetUser.user_metadata?.vehicle as string) || '',
        is_active: true,
        created_at: targetUser.created_at ?? new Date().toISOString(),
        created_by: null,
      };

      try {
        await supabase.from('profiles').upsert(fallbackProfile, { onConflict: 'id' });
      } catch {
        // ignore
      }

      setProfile(fallbackProfile);
      setIsProfileLoading(false);
      return fallbackProfile;
    } catch {
      // Ignored
    }

    setProfile(null);
    setIsProfileLoading(false);
    return null;
  }, []);

  // ── Initialise session on mount ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
      supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
        if (!mounted) return;
        if (currentSession?.user) {
          await fetchProfile(currentSession.user);
          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }).catch(() => {
        if (mounted) setIsLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, updatedSession) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT' || !updatedSession?.user) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (updatedSession?.user) {
          await fetchProfile(updatedSession.user);
          setSession(updatedSession);
          setUser(updatedSession.user);
        }
        setIsLoading(false);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Supabase not configured
      setIsLoading(false);
    }
  }, [fetchProfile]);

  // ── loginAsDemo — disabled, kept for API compatibility ──────────────────────
  const loginAsDemo = useCallback((_role?: UserRole): UserRole => {
    // No-op: demo login is disabled. Authentication is real Supabase only.
    return 'client';
  }, []);

  // ── signIn — REAL Supabase auth only ─────────────────────────────────────────
  const signIn = useCallback(async (
    email: string,
    password: string,
  ): Promise<SignInResult> => {
    if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
      return {
        error: new Error('Supabase non configuré. Veuillez configurer vos clés Supabase.'),
        role: 'client',
        user: null,
        profile: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) {
        return {
          error: error ?? new Error('Connexion échouée'),
          role: 'client',
          user: null,
          profile: null,
        };
      }

      setUser(data.user);
      setSession(data.session);
      const userProfile = await fetchProfile(data.user);
      const resolved = resolveRole(data.user, userProfile);
      return { error: null, role: resolved, user: data.user, profile: userProfile };

    } catch (err) {
      return { error: err as Error, role: 'client', user: null, profile: null };
    }
  }, [fetchProfile]);

  // ── signOut ──────────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  // ── refreshProfile ──────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  // ── updateUserProfile ───────────────────────────────────────────────────────
  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    const targetId = user?.id || profile?.id;
    const targetEmail = user?.email || profile?.email || '';

    const merged: UserProfile = {
      id: targetId || '',
      email: targetEmail,
      full_name: updates.full_name ?? profile?.full_name ?? '',
      phone: updates.phone ?? profile?.phone ?? '',
      role: updates.role ?? profile?.role ?? 'client',
      company_name: updates.company_name ?? profile?.company_name ?? '',
      zone: updates.zone ?? profile?.zone ?? '',
      vehicle: updates.vehicle ?? profile?.vehicle ?? '',
      is_active: updates.is_active ?? profile?.is_active ?? true,
      created_at: profile?.created_at ?? new Date().toISOString(),
      created_by: profile?.created_by ?? null,
    };

    setProfile(merged);

    if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && targetId) {
      try {
        const updatePayload: Record<string, unknown> = {
          full_name: merged.full_name,
          phone: merged.phone,
          company_name: merged.company_name,
          zone: merged.zone,
          vehicle: merged.vehicle,
        };

        const { error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', targetId);

        if (error) {
          return { success: false, error: error.message };
        }

        try {
          await supabase.auth.updateUser({
            data: {
              full_name: merged.full_name,
              phone: merged.phone,
            },
          });
        } catch {
          // ignore
        }
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }

    return { success: true };
  }, [user, profile]);

  const effectiveRole = resolveRole(user, profile);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role: effectiveRole,
    isLoading,
    isProfileLoading,
    signIn,
    loginAsDemo,
    signOut,
    refreshProfile,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
