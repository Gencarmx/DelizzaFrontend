-- ============================================================
-- FIX COMPLETO: Políticas RLS para profiles (sin recursión)
-- ============================================================
-- CAUSA DE RECURSIÓN:
--   La política usaba JOIN profiles owner ON b.owner_id = owner.id
--   dentro de una política ON profiles → PostgreSQL evalúa la
--   política al leer profiles, que vuelve a leer profiles → loop.
--
-- SOLUCIÓN:
--   Función SECURITY DEFINER que lee profiles sin RLS activo,
--   devuelve el profile.id del usuario actual, y se usa en la
--   política sin tocar la tabla profiles directamente.
-- ============================================================

-- PASO 1: Función helper que bypassa RLS para obtener profile_id
CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- PASO 2: Eliminar TODAS las políticas existentes en profiles
DROP POLICY IF EXISTS "Allow insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_restaurant_customers_select" ON profiles;
DROP POLICY IF EXISTS "Business owners can view customer profiles" ON profiles;
DROP POLICY IF EXISTS "Owners can view customer profiles" ON profiles;

-- PASO 3: Recrear políticas limpias

-- Política 1: Usuarios ven su propio perfil
CREATE POLICY "profiles_own_select" ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política 2: Usuarios actualizan su propio perfil
CREATE POLICY "profiles_own_update" ON profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política 3: Insert al registrarse
CREATE POLICY "profiles_insert" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Política 4: Owners ven perfiles de clientes de su negocio
-- Usa get_current_user_profile_id() para evitar recursión
CREATE POLICY "profiles_restaurant_customers_select" ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    JOIN businesses b ON b.id = o.business_id
    WHERE o.customer_id = profiles.id
      AND b.owner_id = get_current_user_profile_id()
  )
);

-- PASO 4: Verificar políticas resultantes
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
