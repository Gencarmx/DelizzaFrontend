-- ============================================================
-- FIX COMPLETO: Políticas RLS para profiles
-- Limpia duplicados y agrega política para restaurantes
-- ============================================================

-- 1. Eliminar TODAS las políticas existentes en profiles para limpiar duplicados
DROP POLICY IF EXISTS "Allow insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_restaurant_customers_select" ON profiles;

-- 2. Recrear políticas limpias

-- Política 1: Usuarios pueden ver su propio perfil
CREATE POLICY "profiles_own_select" ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política 2: Usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_own_update" ON profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política 3: Permitir insert (para registro)
CREATE POLICY "profiles_insert" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Política 4: RESTAURANTES pueden ver perfiles de sus clientes
-- Esto permite que el restaurante vea el nombre del cliente en los pedidos
CREATE POLICY "profiles_restaurant_customers_select" ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM orders o
    JOIN businesses b ON o.business_id = b.id
    JOIN profiles owner ON b.owner_id = owner.id
    WHERE o.customer_id = profiles.id
    AND owner.user_id = auth.uid()
  )
);

-- 3. Verificar políticas finales
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4. Test: Verificar que el owner puede ver el perfil del cliente
SELECT 
  'Test: Perfiles visibles para el restaurante' as test,
  p.id as profile_id,
  p.full_name,
  p.user_id,
  p.role,
  o.id as order_id,
  o.total,
  b.name as business_name
FROM profiles p
JOIN orders o ON o.customer_id = p.id
JOIN businesses b ON o.business_id = b.id
WHERE b.owner_id = 'e342922a-de22-4366-97d5-1bb68e60745a'  -- Owner de JojosPizza
AND o.created_at > NOW() - INTERVAL '1 hour'
LIMIT 5;
