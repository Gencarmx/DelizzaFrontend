-- ============================================================
-- FIX: Políticas RLS para order_items
-- Problema: Los restaurantes no pueden ver los items de sus pedidos
-- ============================================================

-- 1. Habilitar RLS en order_items (si no está habilitado)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_policy" ON order_items;

-- 3. Crear política para que restaurantes vean items de sus pedidos
CREATE POLICY "order_items_select_policy" ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN businesses b ON o.business_id = b.id
    WHERE o.id = order_items.order_id
    AND b.owner_id = auth.uid()
  )
);

-- 4. Política para que clientes vean sus propios items
CREATE POLICY "order_items_customer_select" ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND o.customer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- 5. Política para insertar items (solo durante checkout)
CREATE POLICY "order_items_insert_policy" ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND o.customer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- 6. Verificar que las políticas se aplicaron
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'order_items';

-- 7. Test: Verificar que el owner puede ver los items
-- Reemplaza 'b53d6a17-5998-4ce6-9839-3823f621d593' con el ID de orden real
SELECT 
  oi.id,
  oi.order_id,
  oi.product_name,
  oi.quantity,
  oi.price,
  o.business_id,
  b.owner_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN businesses b ON o.business_id = b.id
WHERE oi.order_id = 'b53d6a17-5998-4ce6-9839-3823f621d593';
