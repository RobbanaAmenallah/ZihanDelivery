-- ==============================================================================
-- MIGRATION GLOBALE : Ajout de tous les nouveaux champs sur la table "parcels"
-- À exécuter dans le SQL Editor de Supabase :
-- https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql/new
-- ==============================================================================

-- 1. Champs de règlement (is_settled, settled_at, settlement_method, settlement_note)
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS settlement_method TEXT DEFAULT 'especes',
  ADD COLUMN IF NOT EXISTS settlement_note TEXT DEFAULT NULL;

-- 2. Champs de suivi temporel (accepted_at, status_updated_at, delivered_at)
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Remplissage rétroactif : pour les colis déjà marqués 'delivered', initialiser delivered_at
UPDATE public.parcels
SET delivered_at = COALESCE(status_updated_at, updated_at)
WHERE status = 'delivered' AND delivered_at IS NULL;

-- 4. Vérification immédiate des colonnes créées
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'parcels'
  AND column_name IN ('is_settled', 'settled_at', 'settlement_method', 'settlement_note', 'accepted_at', 'status_updated_at', 'delivered_at')
ORDER BY column_name;
