-- ============================================
-- DIAGNÓSTICO COMPLETO DE REALTIME PARA ORDERS
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase para verificar
-- que Realtime está correctamente configurado

-- 1. VERIFICAR REPLICA IDENTITY
-- Debe decir 'FULL' para que Realtime funcione
SELECT 
    '1. REPLICA IDENTITY' as check_name,
    c.relname AS table_name,
    CASE 
        WHEN c.relreplident = 'f' THEN '✅ FULL (Correcto)'
        WHEN c.relreplident = 'd' THEN '⚠️ DEFAULT (Necesita cambio a FULL)'
        WHEN c.relreplident = 'i' THEN '⚠️ INDEX'
        WHEN c.relreplident = 'n' THEN '❌ NOTHING'
        ELSE '❌ Desconocido'
    END AS status,
    CASE 
        WHEN c.relreplident = 'f' THEN 'Realtime funcionará correctamente'
        ELSE 'Ejecutar: ALTER TABLE orders REPLICA IDENTITY FULL;'
    END AS recommendation
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'orders'
AND n.nspname = 'public';

-- 2. VERIFICAR PUBLICACIÓN REALTIME
-- La tabla debe estar en la publicación supabase_realtime
SELECT 
    '2. PUBLICACIÓN REALTIME' as check_name,
    pt.tablename,
    pt.pubname,
    CASE 
        WHEN pt.pubname IS NOT NULL THEN '✅ En publicación ' || pt.pubname
        ELSE '❌ No está en ninguna publicación'
    END AS status
FROM pg_publication_tables pt
WHERE pt.tablename = 'orders'
AND pt.schemaname = 'public';

-- 3. VERIFICAR RLS ESTÁ HABILITADO
SELECT 
    '3. ROW LEVEL SECURITY (RLS)' as check_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    CASE 
        WHEN c.relrowsecurity = true THEN '✅ RLS Habilitado'
        ELSE '⚠️ RLS Deshabilitado (Las políticas no funcionarán)'
    END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'orders'
AND n.nspname = 'public';

-- 4. VERIFICAR POLÍTICAS PARA ORDERS
SELECT 
    '4. POLÍTICAS RLS PARA ORDERS' as check_name,
    policyname,
    cmd AS operation,
    permissive,
    CASE 
        WHEN policyname LIKE '%realtime%' OR policyname LIKE '%owner%' 
        THEN '✅ Política para owner/restaurante'
        ELSE 'ℹ️ Otra política'
    END AS type
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 5. VERIFICAR ESTRUCTURA DE LA TABLA ORDERS
-- Asegurar que tiene los campos necesarios
SELECT 
    '5. ESTRUCTURA DE ORDERS' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. VERIFICAR CONEXIONES REALTIME ACTIVAS
-- Solo funciona si tienes permisos de superusuario
SELECT 
    '6. CONEXIONES REALTIME' as check_name,
    COUNT(*) as active_connections,
    'Si es 0, no hay suscripciones activas' as note
FROM pg_stat_activity 
WHERE application_name LIKE '%realtime%';

-- ============================================
-- SOLUCIÓN DE PROBLEMAS COMUNES
-- ============================================

-- Si la replica identity no es FULL, ejecutar:
-- ALTER TABLE orders REPLICA IDENTITY FULL;

-- Si la tabla no está en la publicación, ejecutar:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Si RLS está deshabilitado, ejecutar:
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Crear política para que el owner vea sus órdenes:
/*
CREATE POLICY "Enable select for business owners"
ON orders
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM businesses b
        JOIN profiles p ON p.id = b.owner_id
        WHERE b.id = orders.business_id
        AND p.user_id = auth.uid()
    )
);
*/

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
    'VERIFICACIÓN FINAL' as check_name,
    CASE 
        WHEN c.relreplident = 'f' 
             AND EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'orders')
             AND c.relrowsecurity = true
        THEN '✅ REALTIME CONFIGURADO CORRECTAMENTE'
        ELSE '❌ REALTIME TIENE PROBLEMAS - Revisa las recomendaciones arriba'
    END AS overall_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'orders'
AND n.nspname = 'public';
