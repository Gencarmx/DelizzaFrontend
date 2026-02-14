-- ============================================
-- VERIFICAR RELACIÓN ORDERS-PROFILES
-- ============================================

-- 1. Verificar estructura de la tabla orders
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('id', 'customer_id', 'business_id', 'total', 'status', 'created_at')
ORDER BY ordinal_position;

-- 2. Verificar si hay pedidos con customer_id null
SELECT 
    'Pedidos con customer_id NULL' as check_type,
    COUNT(*) as count
FROM orders
WHERE customer_id IS NULL;

-- 3. Verificar si hay pedidos donde customer_id no existe en profiles
SELECT 
    'Pedidos con customer_id inválido' as check_type,
    COUNT(*) as count
FROM orders o
LEFT JOIN profiles p ON p.id = o.customer_id
WHERE o.customer_id IS NOT NULL 
AND p.id IS NULL;

-- 4. Verificar políticas RLS para profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Verificar si el restaurante puede ver datos de profiles
-- (Ejecutar como el usuario del restaurante para probar)
/*
SELECT 
    o.id as order_id,
    o.customer_id,
    p.full_name,
    p.phone_number
FROM orders o
LEFT JOIN profiles p ON p.id = o.customer_id
WHERE o.business_id = 'TU_BUSINESS_ID_AQUI'
LIMIT 5;
*/

-- 6. Verificar foreign key constraint
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'orders'
AND kcu.column_name = 'customer_id';
