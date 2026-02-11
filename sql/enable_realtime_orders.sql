-- ============================================
-- HABILITAR REALTIME PARA TABLA ORDERS
-- ============================================
-- Este script verifica y habilita las notificaciones
-- en tiempo real para la tabla orders

-- 1. Verificar si Realtime está habilitado para la tabla orders
SELECT 
    c.relname AS table_name,
    CASE WHEN c.relreplident = 'f' THEN 'FULL'
         WHEN c.relreplident = 'i' THEN 'INDEX'
         WHEN c.relreplident = 'n' THEN 'NOTHING'
         ELSE 'DEFAULT'
    END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'orders'
AND n.nspname = 'public';

-- 2. Habilitar Realtime para la tabla orders (si no está habilitado)
-- Esto permite que Supabase detecte cambios en la tabla
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 3. Verificar que la tabla está en la publicación de supabase_realtime
-- (Esto normalmente se hace automáticamente, pero verificamos)
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE tablename = 'orders';

-- 4. Si no aparece en la publicación, agregarla:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================
-- VERIFICAR RLS POLICIES PARA REALTIME
-- ============================================
-- Las notificaciones realtime respetan las RLS policies.
-- El usuario debe poder SELECT las órdenes para recibir notificaciones.

-- Verificar políticas existentes para orders
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders';

-- ============================================
-- POLÍTICA ESPECÍFICA PARA NOTIFICACIONES REALTIME
-- ============================================
-- Crear política que permita al owner ver sus órdenes vía Realtime

-- Primero, verificar si existe la política
DO $$
BEGIN
    -- Eliminar política existente si hay conflictos
    DROP POLICY IF EXISTS "Enable realtime for business owners" ON orders;
    
    -- Crear nueva política para realtime
    CREATE POLICY "Enable realtime for business owners"
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
    
    RAISE NOTICE 'Política de realtime creada exitosamente';
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Verificar configuración completa
SELECT 
    'Configuración Realtime para orders:' as check_item,
    CASE 
        WHEN c.relreplident = 'f' THEN '✅ Habilitado (FULL)'
        ELSE '❌ No habilitado'
    END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'orders'
AND n.nspname = 'public';

-- Verificar políticas activas
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'orders'
AND policyname LIKE '%realtime%' OR policyname LIKE '%owner%';
