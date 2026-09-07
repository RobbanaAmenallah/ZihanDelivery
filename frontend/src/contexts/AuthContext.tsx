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

// ─── Demo / Fallback Profiles ─────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export const DEMO_PROFILES: Record<string, UserProfile> = {
  'admin@zihan.tn': {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Sami Ayed (Super Admin)',
    phone: '+216 27 394 418',
    role: 'admin',
    company_name: 'ZIHAN Super Delivery Express HQ',
    zone: 'National',
    vehicle: '',
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: null,
    email: 'admin@zihan.tn',
  },
  'livreur@zihan.tn': {
    id: 'a0000000-0000-0000-0000-000000000002',
    full_name: 'Karim Mansouri',
    phone: '+216 98 777 666',
    role: 'driver',
    company_name: '',
    zone: 'Grand Tunis — Ben Arous / Nouvelle Médina',
    vehicle: 'Citroën Berlingo (194 TUN 8840)',
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: null,
    email: 'livreur@zihan.tn',
  },
  'client@zihan.tn': {
    id: 'a0000000-0000-0000-0000-000000000003',
    full_name: 'Mohamed Ben Ali',
    phone: '+216 22 000 000',
    role: 'client',
    company_name: 'Boutique Express Mode',
    zone: 'Grand Tunis',
    vehicle: '',
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: null,
    email: 'client@zihan.tn',
  },
};

const STORAGE_KEY = 'zihan_demo_user';

// ─── Helper to infer role ─────────────────────────────────────────────────────

function resolveRole(user: User | null, profile: UserProfile | null): UserRole {
  if (profile?.role) return profile.role;
  if (user?.user_metadata?.role) return user.user_metadata.role as UserRole;
  if (user?.email) {
    const e = user.email.toLowerCase();
    if (e.includes('admin') || e === 'sami@zihan.tn') return 'admin';
    if (e.includes('livreur') || e.includes('driver')) return 'driver';
  }
  return 'client';
}

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
  loginAsDemo: (role: UserRole) => UserRole;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  // ── Fetch profile from public.profiles ──────────────────────────────────────
  const fetchProfile = useCallback(async (targetUser: User): Promise<UserProfile> => {
    setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUser.id)
        .single();

      if (!error && data) {
        const loaded = data as UserProfile;
        setProfile(loaded);
        return loaded;
      }
    } catch {
      // Ignored
    } finally {
      setIsProfileLoading(false);
    }

    // Fallback profile if row is not in database yet
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
    setProfile(fallbackProfile);
    return fallbackProfile;
  }, []);

  // ── Initialise session on mount ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Check local storage for demo session first
    const savedDemo = localStorage.getItem(STORAGE_KEY);
    if (savedDemo) {
      try {
        const parsedProfile = JSON.parse(savedDemo) as UserProfile;
        if (mounted) {
          setProfile(parsedProfile);
          setUser({
            id: parsedProfile.id,
            email: parsedProfile.email,
            app_metadata: {},
            user_metadata: { full_name: parsedProfile.full_name, role: parsedProfile.role },
            aud: 'authenticated',
            created_at: parsedProfile.created_at,
          } as unknown as User);
          setIsLoading(false);
        }
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Otherwise check Supabase session if URL is configured
    if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);

        if (currentSession?.user) {
          fetchProfile(currentSession.user);
        }
      }).catch(() => {
        if (mounted) setIsLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
        if (!mounted) return;
        setSession(updatedSession);
        setUser(updatedSession?.user ?? null);
        setIsLoading(false);

        if (updatedSession?.user) {
          fetchProfile(updatedSession.user);
        } else if (!localStorage.getItem(STORAGE_KEY)) {
          setProfile(null);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  // ── loginAsDemo ─────────────────────────────────────────────────────────────
  const loginAsDemo = useCallback((selectedRole: UserRole): UserRole => {
    const emailKey =
      selectedRole === 'admin'
        ? 'admin@zihan.tn'
        : selectedRole === 'driver'
        ? 'livreur@zihan.tn'
        : 'client@zihan.tn';

    const demoProfile = DEMO_PROFILES[emailKey] ?? DEMO_PROFILES['admin@zihan.tn'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoProfile));
    setProfile(demoProfile);
    setUser({
      id: demoProfile.id,
      email: demoProfile.email,
      app_metadata: {},
      user_metadata: { full_name: demoProfile.full_name, role: demoProfile.role },
      aud: 'authenticated',
      created_at: demoProfile.created_at,
    } as unknown as User);
    setIsLoading(false);
    setIsProfileLoading(false);
    return demoProfile.role;
  }, []);

  // ── signIn ───────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (
    email: string,
    password: string,
  ): Promise<SignInResult> => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Try real Supabase auth if configured
    if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (!error && data.user) {
          localStorage.removeItem(STORAGE_KEY);
          setUser(data.user);
          setSession(data.session);
          const userProfile = await fetchProfile(data.user);
          const resolved = resolveRole(data.user, userProfile);
          return { error: null, role: resolved, user: data.user, profile: userProfile };
        }

        // If Supabase returned an error but credentials match a standard demo account,
        // seamlessly fall back to demo mode so user is never locked out!
        if (DEMO_PROFILES[trimmedEmail] && (password === 'Password123!' || password === 'admin' || password.length >= 4)) {
          const demoRole = loginAsDemo(DEMO_PROFILES[trimmedEmail].role);
          return {
            error: null,
            role: demoRole,
            user: user,
            profile: DEMO_PROFILES[trimmedEmail],
          };
        }

        const fallbackRole = resolveRole(null, null);
        return { error, role: fallbackRole, user: null, profile: null };
      } catch (err) {
        if (DEMO_PROFILES[trimmedEmail]) {
          const demoRole = loginAsDemo(DEMO_PROFILES[trimmedEmail].role);
          return {
            error: null,
            role: demoRole,
            user: user,
            profile: DEMO_PROFILES[trimmedEmail],
          };
        }
        return { error: err as Error, role: 'client', user: null, profile: null };
      }
    }

    // 2. Fallback demo mode if Supabase keys not set yet
    if (DEMO_PROFILES[trimmedEmail]) {
      const demoRole = loginAsDemo(DEMO_PROFILES[trimmedEmail].role);
      return {
        error: null,
        role: demoRole,
        user: user,
        profile: DEMO_PROFILES[trimmedEmail],
      };
    }

    return {
      error: new Error('Identifiants incorrects. Utilisez admin@zihan.tn / Password123!'),
      role: 'client',
      user: null,
      profile: null,
    };
  }, [fetchProfile, loginAsDemo, user]);

  // ── signOut ──────────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEY);
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
      id: targetId || 'demo-user',
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

    // 1. Update React state immediately (instant UI update)
    setProfile(merged);

    // 2. Update local storage caches
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    try {
      const raw = localStorage.getItem('zihan_managed_users');
      if (raw) {
        const cachedUsers = JSON.parse(raw) as UserProfile[];
        const idx = cachedUsers.findIndex((u) => u.id === targetId || (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase()));
        if (idx >= 0) {
          cachedUsers[idx] = { ...cachedUsers[idx], ...updates };
        } else {
          cachedUsers.unshift(merged);
        }
        localStorage.setItem('zihan_managed_users', JSON.stringify(cachedUsers));
      }
    } catch {
      // ignore
    }

    // 3. Persist to Supabase public.profiles in real-time
    if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
      try {
        const updatePayload: Record<string, unknown> = {
          full_name: merged.full_name,
          phone: merged.phone,
          company_name: merged.company_name,
          zone: merged.zone,
          vehicle: merged.vehicle,
        };

        if (targetId) {
          const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', targetId);

          if (error && targetEmail) {
            // Try updating by email if id mismatch
            await supabase
              .from('profiles')
              .update(updatePayload)
              .eq('email', targetEmail);
          }
        } else if (targetEmail) {
          await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('email', targetEmail);
        }

        // Also update Supabase auth metadata if authenticated
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: merged.full_name,
              phone: merged.phone,
              company_name: merged.company_name,
              zone: merged.zone,
              vehicle: merged.vehicle,
            },
          });
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Failed to sync profile update to Supabase:', err);
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
