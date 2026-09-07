-- ─── ZIHAN SUPER DELIVERY — Notifications Table ──────────────────────────────
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  body        text        NOT NULL,
  type        text        NOT NULL DEFAULT 'info', -- info | success | warning | error | parcel
  is_read     boolean     NOT NULL DEFAULT false,
  link        text,                                -- optional internal route e.g. /admin/shipments
  meta        jsonb,                               -- extra data e.g. { tracking_number: "ZH000153" }
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user-based lookups
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (admin) can insert for any user
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ── Seed Demo Notifications ───────────────────────────────────────────────────
-- Replace the UUIDs below with real user IDs from your auth.users table
-- INSERT INTO public.notifications (user_id, title, body, type, link)
-- VALUES
--   ('your-admin-uuid', 'Nouveau colis enregistré', 'Le colis ZH000160 a été créé par Boutique Express Mode.', 'parcel', '/admin/shipments'),
--   ('your-driver-uuid', 'Nouvelle tournée assignée', '3 colis vous ont été assignés pour aujourd''hui.', 'success', '/driver');
