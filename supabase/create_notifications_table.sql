-- ==============================================================================
-- ZIHAN SUPER DELIVERY EXPRESS — Table des Notifications & Temps Réel
-- Exécutez ce script dans le SQL Editor de Supabase (https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql)
-- ==============================================================================

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

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id, created_at DESC);

-- Désactiver RLS pour accès fluide
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Activer le CDC Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Triggers automatiques de génération de notifications sur les événements Colis
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

  -- B. CHANGEMENT DE CHAUFFEUR -> Notifier le chauffeur
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

    -- C. CHANGEMENT DE STATUT -> Notifier l'expéditeur
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

SELECT 'Table des notifications et triggers configurés avec succès !' AS result;
