-- ==============================================================================
-- TABLE DES TARIFICATIONS CLIENTS PERSONNALISÉES : ZIHAN SUPER DELIVERY
-- Exécutez ce script dans le SQL Editor de Supabase (https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql)
-- ==============================================================================

-- 1. Création de la table des règles tarifaires clients
CREATE TABLE IF NOT EXISTS public.client_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  client_name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  flat_rate NUMERIC(10, 3) NOT NULL DEFAULT 8.000,
  custom_note TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_client_pricing_client_name ON public.client_pricing_rules (lower(trim(client_name)));
CREATE INDEX IF NOT EXISTS idx_client_pricing_company_name ON public.client_pricing_rules (lower(trim(company_name)));

-- 3. Désactiver RLS pour accès direct fluide
ALTER TABLE public.client_pricing_rules DISABLE ROW LEVEL SECURITY;

-- 4. Activer le TEMPS RÉEL (Supabase Realtime CDC)
ALTER TABLE public.client_pricing_rules REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'client_pricing_rules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_pricing_rules;
  END IF;
END $$;

SELECT 'Table public.client_pricing_rules créée et connectée au Realtime Supabase avec succès !' AS result;
