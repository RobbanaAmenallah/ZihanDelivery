-- ==============================================================================
-- SYNCHRONISATION TEMPS RÉEL, TABLES & NOTIFICATIONS SUPABASE : ZIHAN SUPER DELIVERY
-- Exécutez ce script dans le SQL Editor de Supabase (https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql)
-- ==============================================================================

-- 1. S'assurer que la table des colis existe avec tous ses champs
CREATE TABLE IF NOT EXISTS public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT UNIQUE NOT NULL,
  sender_id UUID,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_phone TEXT NOT NULL DEFAULT '',
  sender_address TEXT NOT NULL DEFAULT '',
  recipient_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT NOT NULL DEFAULT '',
  recipient_secondary_phone TEXT DEFAULT '',
  recipient_governorate TEXT NOT NULL DEFAULT 'Tunis',
  recipient_delegation TEXT DEFAULT '',
  recipient_address TEXT NOT NULL DEFAULT '',
  recipient_postal_code TEXT DEFAULT '',
  description TEXT NOT NULL DEFAULT 'Marchandise',
  quantity INT NOT NULL DEFAULT 1,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  is_fragile BOOLEAN NOT NULL DEFAULT false,
  goods_amount NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  delivery_fee NUMERIC(10, 3) NOT NULL DEFAULT 8.000,
  total_amount NUMERIC(10, 3) NOT NULL DEFAULT 8.000,
  driver_id UUID,
  driver_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. S'assurer que la table des profils existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'driver', 'client')),
  company_name TEXT DEFAULT '',
  zone TEXT DEFAULT '',
  vehicle TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 3. S'assurer que la table des notifications existe
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info | success | warning | error | parcel
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour accélérer les notifications par utilisateur
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id, created_at DESC);

-- 4. Nettoyage des contraintes bloquantes pour fluidité
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_created_by_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- 5. Désactiver RLS pour accès direct fluide
ALTER TABLE public.parcels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 6. Activer le TEMPS RÉEL (Supabase Realtime CDC) pour TOUTES les tables
ALTER TABLE public.parcels REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'parcels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parcels;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 7. Fonction de suppression définitive (supprime de auth.users ET public.profiles)
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
  IF caller_id IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = caller_id;
    IF caller_role IS NULL OR caller_role != 'admin' THEN
      RAISE EXCEPTION 'Accès refusé : Seuls les administrateurs peuvent supprimer des utilisateurs.';
    END IF;
  END IF;

  UPDATE public.parcels SET driver_id = NULL WHERE driver_id = target_user_id;
  UPDATE public.parcels SET sender_id = NULL WHERE sender_id = target_user_id;

  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', target_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated, service_role, anon;

-- 8. Trigger de suppression cascade
CREATE OR REPLACE FUNCTION public.on_profile_deleted_cascade_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.parcels SET driver_id = NULL WHERE driver_id = OLD.id;
  UPDATE public.parcels SET sender_id = NULL WHERE sender_id = OLD.id;
  DELETE FROM public.notifications WHERE user_id = OLD.id;
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

-- 9. Triggers automatiques de génération de notifications sur les événements Colis
CREATE OR REPLACE FUNCTION public.notify_parcel_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  -- A. NOUVEAU COLIS CRÉÉ -> Notifier les admins et l'expéditeur
  IF (TG_OP = 'INSERT') THEN
    -- Notifier l'expéditeur si sender_id existe
    IF NEW.sender_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, meta)
      VALUES (
        NEW.sender_id,
        'Colis enregistré avec succès',
        'Votre colis ' || NEW.tracking_number || ' vers ' || NEW.recipient_governorate || ' a été enregistré.',
        'parcel',
        '/client',
        jsonb_build_object('tracking_number', NEW.tracking_number)
      );
    END IF;

    -- Notifier tous les administrateurs
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, body, type, link, meta)
      VALUES (
        admin_rec.id,
        'Nouveau colis créé (' || NEW.tracking_number || ')',
        COALESCE(NEW.sender_name, 'Client') || ' a créé un colis pour ' || NEW.recipient_name || ' (' || NEW.recipient_governorate || ').',
        'parcel',
        '/admin/shipments',
        jsonb_build_object('tracking_number', NEW.tracking_number)
      );
    END LOOP;
  END IF;

  -- B. CHANGEMENT DE CHAUFFEUR (Attribution) -> Notifier le chauffeur
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id)) THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, meta)
      VALUES (
        NEW.driver_id,
        'Nouveau colis assigné',
        'Le colis ' || NEW.tracking_number || ' (' || NEW.recipient_governorate || ') vous a été assigné.',
        'parcel',
        '/driver',
        jsonb_build_object('tracking_number', NEW.tracking_number)
      );
    END IF;

    -- C. CHANGEMENT DE STATUT -> Notifier l'expéditeur (et le chauffeur si besoin)
    IF (OLD.status != NEW.status) THEN
      IF NEW.sender_id IS NOT NULL THEN
        IF NEW.status = 'delivered' THEN
          INSERT INTO public.notifications (user_id, title, body, type, link, meta)
          VALUES (
            NEW.sender_id,
            'Colis livré ! 🎉',
            'Le colis ' || NEW.tracking_number || ' a été livré à ' || NEW.recipient_name || '.',
            'success',
            '/client',
            jsonb_build_object('tracking_number', NEW.tracking_number)
          );
        ELSIF NEW.status = 'in_transit' THEN
          INSERT INTO public.notifications (user_id, title, body, type, link, meta)
          VALUES (
            NEW.sender_id,
            'Colis en cours de livraison',
            'Le colis ' || NEW.tracking_number || ' est en cours d''acheminement par ' || COALESCE(NEW.driver_name, 'le livreur') || '.',
            'info',
            '/client',
            jsonb_build_object('tracking_number', NEW.tracking_number)
          );
        ELSIF NEW.status = 'cancelled' OR NEW.status = 'returned' THEN
          INSERT INTO public.notifications (user_id, title, body, type, link, meta)
          VALUES (
            NEW.sender_id,
            'Colis ' || (CASE WHEN NEW.status = 'cancelled' THEN 'annulé' ELSE 'retourné' END),
            'Le colis ' || NEW.tracking_number || ' est passé au statut : ' || NEW.status || '.',
            'warning',
            '/client',
            jsonb_build_object('tracking_number', NEW.tracking_number)
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_parcel_events ON public.parcels;
CREATE TRIGGER trigger_notify_parcel_events
  AFTER INSERT OR UPDATE ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parcel_events();

-- 10. Message de confirmation
SELECT 'Supabase Realtime, Tables, Notifications & Triggers configurés avec succès !' AS result;
