-- ==============================================================================
-- MIGRATION : Ajout du statut de règlement "is_settled"
-- Exécuter dans le SQL Editor de Supabase
-- https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql
-- ==============================================================================

-- 1. Ajouter la colonne is_settled (false = non réglé par défaut)
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT false;

-- 2. Ajouter la date de règlement pour traçabilité
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'parcels'
  AND column_name IN ('is_settled', 'settled_at');
