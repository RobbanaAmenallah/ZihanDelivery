-- ==============================================================================
-- DÉBLOCAGE RLS : TABLE CLIENT_PRICING_RULES (ZIHAN DELIVERY)
-- À exécuter dans le SQL Editor de Supabase
-- https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql
-- ==============================================================================

-- 1. S'assurer que la table existe
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

-- 2. DÉSACTIVER LE RLS (Row Level Security)
ALTER TABLE public.client_pricing_rules DISABLE ROW LEVEL SECURITY;

-- 3. Créer une politique globale permissive (au cas où RLS est forcé par Supabase)
DROP POLICY IF EXISTS "Allow all access to client_pricing_rules" ON public.client_pricing_rules;
DROP POLICY IF EXISTS "client_pricing_rules_policy" ON public.client_pricing_rules;

CREATE POLICY "Allow all access to client_pricing_rules"
ON public.client_pricing_rules
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Activer la réplication temps réel (Realtime)
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

SELECT 'RLS débloqué et temps réel activé avec succès sur public.client_pricing_rules !' AS resultat;
