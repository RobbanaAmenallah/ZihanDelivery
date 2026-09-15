-- ============================================================
-- ZIHAN DELIVERY — Verification de tous les anciens comptes
-- Executer dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Marquer tous les comptes non confirmes comme verifies
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at         = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Verification — nombre de comptes mis a jour
SELECT
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) AS comptes_verifies,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL)     AS comptes_non_verifies,
  COUNT(*)                                                AS total
FROM auth.users;

-- Resultat attendu : comptes_non_verifies = 0
