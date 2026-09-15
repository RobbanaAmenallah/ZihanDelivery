-- ==============================================================================
-- CORRECTION DE LA SUPPRESSION DÉFINITIVE D'UTILISATEUR (AUTH + PROFILES)
-- ZIHAN SUPER DELIVERY EXPRESS
-- Exécutez ce script dans le SQL Editor de Supabase (https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql)
-- ==============================================================================

-- 1. Fonction RPC sécurisée (SECURITY DEFINER) pour supprimer un utilisateur
--    Elle supprime à la fois de auth.users (authentification) et public.profiles
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role TEXT;
  caller_id UUID := auth.uid();
BEGIN
  -- Vérification des privilèges : si exécuté par un utilisateur connecté, doit être admin
  IF caller_id IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = caller_id;
    IF caller_role IS NULL OR caller_role != 'admin' THEN
      RAISE EXCEPTION 'Accès refusé : Seuls les administrateurs peuvent supprimer des utilisateurs.';
    END IF;
  END IF;

  -- 1. Détacher les références dans la table des colis (éviter les blocages de clés étrangères)
  UPDATE public.parcels SET driver_id = NULL WHERE driver_id = target_user_id;
  UPDATE public.parcels SET sender_id = NULL WHERE sender_id = target_user_id;

  -- 2. Supprimer de la table public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 3. Supprimer les identités et sessions associées dans auth
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;

  -- 4. Supprimer le compte de la table auth.users (Suppression définitive de la connexion)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Utilisateur supprimé définitivement de la base et de la table d''authentification.',
    'deleted_id', target_user_id
  );
END;
$$;

-- Accorder le droit d'exécution de la fonction
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated, service_role, anon;

-- 2. Trigger de suppression automatique : si une ligne est supprimée de public.profiles,
--    supprimer automatiquement le compte de auth.users correspondant
CREATE OR REPLACE FUNCTION public.on_profile_deleted_cascade_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Détacher les colis
  UPDATE public.parcels SET driver_id = NULL WHERE driver_id = OLD.id;
  UPDATE public.parcels SET sender_id = NULL WHERE sender_id = OLD.id;

  -- Supprimer de auth.identities et auth.users si existant
  DELETE FROM auth.identities WHERE user_id = OLD.id;
  DELETE FROM auth.users WHERE id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_profile_deleted_cascade_auth ON public.profiles;
CREATE TRIGGER trigger_on_profile_deleted_cascade_auth
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_profile_deleted_cascade_auth();

-- 3. Message de confirmation
SELECT 'Fonction delete_user_by_admin et trigger de suppression cascade configurés avec succès !' AS result;
