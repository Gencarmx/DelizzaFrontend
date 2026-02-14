-- ============================================================
-- DIAGNÓSTICO: Verificar acceso a order_items
-- ============================================================

-- 1. Verificar el usuario actual (simulado con auth.uid())
SELECT 
  auth.uid() as current_user_id,
  current_user as current_role,
  session_user as session_role;

-- 2. Verificar el negocio y su owner
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.owner_id,
  p.full_name as owner_name,
  p.user_id as owner_auth_id
FROM businesses b
LEFT JOIN profiles p ON b.owner_id = p.id
WHERE b.id = 'c150bc32-75e6-49ba-b5be-4cf0226ae6e2';  -- ID del negocio de JojosPizza

-- 3. Verificar si el usuario actual puede ver los order_items
-- Simulando la política RLS
SELECT 
  oi.id,
  oi.order_id,
  oi.product_name,
  oi.quantity,
  oi.price,
  o.business_id,
  b.owner_id,
  auth.uid() as current_auth_uid
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN businesses b ON o.business_id = b.id
WHERE oi.order_id = '4a42497e-7bde-45f4-8155-7a9faace7065'  -- ID del pedido más reciente
AND b.owner_id = auth.uid();  -- Esta es la condición de la política RLS

-- 4. Verificar TODOS los pedidos recientes y sus items
SELECT 
  o.id as order_id,
  o.total,
  o.status,
  o.created_at,
  oi.id as item_id,
  oi.product_name,
  oi.quantity,
  oi.price,
  b.name as business_name,
  b.owner_id,
  auth.uid() as current_user
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN businesses b ON o.business_id = b.id
WHERE o.created_at > NOW() - INTERVAL '1 hour'
ORDER BY o.created_at DESC;

-- 5. Verificar políticas activas en order_items
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies 
WHERE tablename = 'order_items'
ORDER BY policyname;

-- 6. Verificar si hay algún error en la política
-- Comparar owner_id del negocio con auth.uid()
SELECT 
  CASE 
    WHEN b.owner_id = auth.uid() THEN '✅ MATCH - Usuario es el owner'
    ELSE '❌ MISMATCH - Usuario NO es el owner'
  END as ownership_check,
  b.owner_id,
  auth.uid() as current_auth_uid,
  b.name as business_name
FROM businesses b
WHERE b.id = 'c150bc32-75e6-49ba-b5be-4cf0226ae6e2';
