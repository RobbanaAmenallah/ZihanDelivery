-- ==============================================================================
-- FONCTION RPC POUR MODIFIER L'EMAIL D'UN UTILISATEUR PARTOUT DANS SUPABASE
-- (auth.users, auth.identities, public.profiles)
-- ZIHAN SUPER DELIVERY EXPRESS
-- Exécutez ce script dans le SQL Editor de Supabase (https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_user_email_by_admin(target_user_id UUID, new_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role TEXT;
  caller_id UUID := auth.uid();
  clean_email TEXT := LOWER(TRIM(new_email));
BEGIN
  -- 1. Vérification des droits administrateur si appelé par un utilisateur connecté
  IF caller_id IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = caller_id;
    IF caller_role IS NULL OR caller_role != 'admin' THEN
      RAISE EXCEPTION 'Accès refusé : Seuls les administrateurs peuvent modifier les adresses email.';
    END IF;
  END IF;

  -- 2. Validation du format de l'email
  IF clean_email IS NULL OR clean_email = '' OR position('@' in clean_email) = 0 THEN
    RAISE EXCEPTION 'Adresse email invalide.';
  END IF;

  -- 3. Vérifier si l'adresse est déjà utilisée par un autre utilisateur
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email AND id != target_user_id) THEN
    RAISE EXCEPTION 'L''adresse email % est déjà utilisée par un autre compte.', clean_email;
  END IF;

  -- 4. Mettre à jour public.profiles
  UPDATE public.profiles
  SET email = clean_email
  WHERE id = target_user_id;

  -- 5. Mettre à jour auth.identities (pour que la connexion email fonctionne avec le nouvel identifiant)
  UPDATE auth.identities
  SET identity_data = jsonb_set(
        COALESCE(identity_data, '{}'::jsonb),
        '{email}',
        to_jsonb(clean_email)
      ),
      provider_id = clean_email,
      updated_at = now()
  WHERE user_id = target_user_id;

  -- 6. Mettre à jour auth.users (email + confirmation automatique + annulation de pending email_change)
  UPDATE auth.users
  SET email = clean_email,
      email_change = '',
      email_change_token_new = '',
      email_change_confirm_status = 0,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Adresse email modifiée avec succès dans l''authentification et la base de données.',
    'user_id', target_user_id,
    'new_email', clean_email
  );
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.update_user_email_by_admin(UUID, TEXT) TO authenticated, service_role, anon;

SELECT 'Fonction update_user_email_by_admin installée avec succès !' AS result;
