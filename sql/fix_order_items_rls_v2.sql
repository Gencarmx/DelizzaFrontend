-- ============================================================
-- FIX v2: Corregir políticas RLS para order_items
-- Problema: owner_id es profile.id, auth.uid() es auth.users.id
-- Solución: Comparar auth.uid() con profiles.user_id
-- ============================================================

-- 1. Eliminar políticas anteriores que no funcionan
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_customer_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;

-- 2. Crear política CORREGIDA para restaurantes (owners)
-- Ahora comparamos auth.uid() con profiles.user_id
CREATE POLICY "order_items_owner_select" ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM orders o
    JOIN businesses b ON o.business_id = b.id
    JOIN profiles p ON b.owner_id = p.id
    WHERE o.id = order_items.order_id
    AND p.user_id = auth.uid()  -- Comparar con auth.users.id
  )
);

-- 3. Crear política para clientes (quienes hacen el pedido)
CREATE POLICY "order_items_customer_select" ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM orders o
    JOIN profiles p ON o.customer_id = p.id
    WHERE o.id = order_items.order_id
    AND p.user_id = auth.uid()  -- Comparar con auth.users.id
  )
);

-- 4. Crear política para insertar items (durante checkout)
CREATE POLICY "order_items_insert" ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM orders o
    JOIN profiles p ON o.customer_id = p.id
    WHERE o.id = order_items.order_id
    AND p.user_id = auth.uid()
  )
);

-- 5. Verificar que las políticas se aplicaron correctamente
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies 
WHERE tablename = 'order_items'
ORDER BY policyname;

-- 6. Test: Verificar que el owner puede ver los items con la nueva política
-- Simulando auth.uid() = '347861fe-d0c2-4da5-bd60-7e5138b9f3f0' (owner_auth_id de Juanito)
SELECT 
  oi.id,
  oi.order_id,
  oi.product_name,
  oi.quantity,
  oi.price,
  o.business_id,
  b.name as business_name,
  b.owner_id,
  p.user_id as owner_auth_id,
  '347861fe-d0c2-4da5-bd60-7e5138b9f3f0' as simulated_auth_uid
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN businesses b ON o.business_id = b.id
JOIN profiles p ON b.owner_id = p.id
WHERE oi.order_id = '4a42497e-7bde-45f4-8155-7a9faace7065'
AND p.user_id = '347861fe-d0c2-4da5-bd60-7e5138b9f3f0';  -- Simulando auth.uid()
