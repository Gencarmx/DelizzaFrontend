-- ============================================================
-- FIX: Permitir a restaurantes ver perfiles de sus clientes
-- Problema: Los restaurantes no pueden ver el nombre de sus clientes
-- Solución: Política RLS para que owners vean perfiles de clientes que hicieron pedidos
-- ============================================================

-- 1. Verificar políticas actuales en profiles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Crear política para que restaurantes vean perfiles de sus clientes
DROP POLICY IF EXISTS "profiles_restaurant_customers_select" ON profiles;

CREATE POLICY "profiles_restaurant_customers_select" ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM orders o
    JOIN businesses b ON o.business_id = b.id
    WHERE o.customer_id = profiles.id
    AND b.owner_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- 3. Verificar que la política se aplicó
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. Test: Verificar que el owner puede ver el perfil del cliente
-- Simulando auth.uid() = '347861fe-d0c2-4da5-bd60-7e5138b9f3f0' (owner de JojosPizza)
SELECT 
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
