-- ============================================================
-- SOLUCIÓN ALTERNATIVA: Agregar customer_name a orders
-- Evita recursión RLS al guardar el nombre directamente
-- ============================================================

-- 1. Agregar columna customer_name a orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 2. Actualizar pedidos existentes con el nombre del cliente
UPDATE orders o
SET customer_name = p.full_name
FROM profiles p
WHERE o.customer_id = p.id
AND o.customer_name IS NULL;

-- 3. Verificar que se actualizaron
SELECT 
  o.id,
  o.customer_id,
  o.customer_name,
  o.total,
  o.created_at
FROM orders o
WHERE o.created_at > NOW() - INTERVAL '1 hour'
ORDER BY o.created_at DESC
LIMIT 5;
