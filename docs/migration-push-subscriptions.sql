-- ============================================================================
-- MIGRACIÓN: Tabla push_subscriptions — Web Push Notifications
-- Proyecto: Delizza
-- Fecha: 2026-04-01
--
-- INSTRUCCIONES:
--   1. Abre el SQL Editor en tu proyecto de Supabase.
--   2. Pega y ejecuta este script completo en un solo bloque.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 1: Crear tabla push_subscriptions
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile_id
  ON public.push_subscriptions(profile_id);


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 2: Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede gestionar sus propias suscripciones
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Permisos de tabla para los roles de Supabase
-- (Las tablas creadas vía SQL Editor no reciben grants automáticos)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT                         ON public.push_subscriptions TO anon;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
--
-- PASOS SIGUIENTES (fuera de Supabase Studio):
--
-- 1. Genera las VAPID keys (ejecutar UNA SOLA VEZ):
--    npx web-push generate-vapid-keys
--
-- 2. Agrega la clave pública al .env del frontend:
--    VITE_VAPID_PUBLIC_KEY=BLxxxx...
--
-- 3. Agrega los secretos a Supabase Edge Functions:
--    supabase secrets set VAPID_PRIVATE_KEY="yyyy..."
--    supabase secrets set VITE_VAPID_PUBLIC_KEY="BLxxxx..."
--    supabase secrets set VAPID_MAILTO="mailto:admin@delizza.com"
--
-- 4. Despliega la Edge Function:
--    supabase functions deploy send-push-notification
--
-- ⚠️  IMPORTANTE: Una vez que usuarios se suscriban NO cambiar las VAPID keys.
--     Cambiarlas invalida todas las suscripciones existentes.
-- ============================================================================
