-- ==============================================================================
-- CORRECTION & CRÉATION COMPLÈTE — ZIHAN SUPER DELIVERY EXPRESS
-- Exécutez TOUT ce script dans le SQL Editor de Supabase (puis cliquez sur RUN)
-- ==============================================================================

-- 0. Activer l'extension pgcrypto pour le hashage des mots de passe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Table des profils publics
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'driver', 'client')),
  company_name TEXT DEFAULT '',
  zone TEXT DEFAULT '',
  vehicle TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Activation de Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Fonction helper SECURITY DEFINER pour éviter la récursion infinie
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Politiques de sécurité RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;

CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );

CREATE POLICY "Users can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR public.is_admin()
  );

CREATE POLICY "Admin can delete profiles" ON public.profiles
  FOR DELETE USING (
    public.is_admin()
  );

-- 4. Trigger automatique pour tout nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = COALESCE(public.profiles.role, EXCLUDED.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. CRÉATION DU COMPTE UNIQUE SUPER ADMIN (Sami Ayed)
-- Email : samiayed1965@gmail.com
-- Mot de passe : Sami1234
-- ==============================================================================

DO $$
DECLARE
  admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
  hashed_pwd TEXT := crypt('Sami1234', gen_salt('bf'));
BEGIN

  -- ── 1. SUPPRESSION DE TOUS LES ANCIENS UTILISATEURS DE TEST ─────────────────
  DELETE FROM auth.identities;
  DELETE FROM public.profiles WHERE id != admin_id;
  DELETE FROM auth.users WHERE id != admin_id AND email != 'samiayed1965@gmail.com';
  DELETE FROM auth.identities WHERE user_id = admin_id;
  DELETE FROM auth.users WHERE id = admin_id OR email = 'samiayed1965@gmail.com';

  -- ── 2. COMPTE SUPER ADMIN (samiayed1965@gmail.com) ──────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'samiayed1965@gmail.com',
    hashed_pwd,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sami Ayed","role":"admin"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    admin_id,
    admin_id,
    format('{"sub":"%s","email":"%s"}', admin_id::text, 'samiayed1965@gmail.com')::jsonb,
    'email',
    'samiayed1965@gmail.com',
    now(),
    now(),
    now()
  );

  INSERT INTO public.profiles (id, full_name, phone, role, company_name, is_active)
  VALUES (
    admin_id,
    'Sami Ayed',
    '+216 27 394 418',
    'admin',
    'ZIHAN Super Delivery Express HQ',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin', full_name = 'Sami Ayed', phone = '+216 27 394 418';

END $$;
