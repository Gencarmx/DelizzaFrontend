-- ============================================================
-- Enfoque conservador: Solo agregar política para restaurantes
-- Sin modificar políticas existentes
-- ============================================================

-- 1. Verificar si la política ya existe
DO $$
BEGIN
  -- Eliminar solo si existe (para recrearla limpia)
  DROP POLICY IF EXISTS "profiles_restaurant_customers_select" ON profiles;
  
  -- Crear la nueva política
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
  
  RAISE NOTICE 'Política profiles_restaurant_customers_select creada exitosamente';
END $$;

-- 2. Verificar todas las políticas en profiles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN policyname = 'profiles_restaurant_customers_select' THEN '✅ NUEVA - Permite ver clientes'
    ELSE 'ℹ️ Existente'
  END as status
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 3. Test: Verificar que el owner puede ver el perfil del cliente
SELECT 
  'Test: Perfiles de clientes visibles' as test,
  p.id as profile_id,
  p.full_name as customer_name,
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
