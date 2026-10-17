-- ==============================================================================
-- MIGRATION GLOBALE : Ajout de tous les nouveaux champs sur la table "parcels"
-- À exécuter dans le SQL Editor de Supabase :
-- https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql/new
-- ==============================================================================

-- 1. Champs de règlement (is_settled et settled_at)
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Champs de suivi temporel (accepted_at et status_updated_at)
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Vérification immédiate des colonnes créées
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'parcels'
  AND column_name IN ('is_settled', 'settled_at', 'accepted_at', 'status_updated_at')
ORDER BY column_name;
