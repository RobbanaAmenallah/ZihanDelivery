-- ============================================================
-- CORRECTION : Récursion infinie dans les politiques RLS
-- Projet : ZIHAN SUPER EXPRESS
-- À exécuter dans : SQL Editor de votre projet Supabase
-- https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql
-- ============================================================

-- ÉTAPE 1 : Supprimer TOUTES les anciennes politiques conflictuelles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;

-- ÉTAPE 2 : Créer une fonction SECURITY DEFINER (ne déclenche pas les RLS)
DROP FUNCTION IF EXISTS public.get_my_role();
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ÉTAPE 3 : Recréer des politiques simples et sans récursion

-- Lire : tout utilisateur connecté peut lire tous les profils
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Insérer : tout utilisateur connecté peut insérer un profil
CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Modifier : l'utilisateur peut modifier son propre profil OU si son rôle est admin
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
)
WITH CHECK (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
);

-- Supprimer : seulement si rôle admin
CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'admin'
);

-- ============================================================
-- VÉRIFICATION : Lister les politiques actives
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';
-- ============================================================
