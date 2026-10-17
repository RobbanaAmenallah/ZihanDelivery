-- ==============================================================================
-- MIGRATION : Ajout des horodatages de suivi de statut des colis
-- Exécuter dans le SQL Editor de Supabase
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Date/heure d'acceptation (quand le colis est accepté OU assigné à un livreur)
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Date/heure de la dernière mise à jour de statut "final"
--    (livré, retourné, refusé, absent, mauvaise adresse, échec, annulé...)
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'parcels'
  AND column_name IN ('accepted_at', 'status_updated_at', 'settled_at', 'is_settled');
