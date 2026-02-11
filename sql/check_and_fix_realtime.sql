-- ============================================
-- DIAGNÓSTICO Y SOLUCIÓN PARA REALTIME
-- ============================================

-- 1. VERIFICAR QUÉ TABLAS ESTÁN EN LA PUBLICACIÓN DE REALTIME
-- La publicación debe incluir la tabla 'orders' para que funcione
SELECT 
    schemaname, 
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime_messages_publication';

-- ============================================
-- SI LA TABLA 'orders' NO APARECE EN LOS RESULTADOS,
-- EJECUTA ESTOS COMANDOS PARA AGREGARLA:
-- ============================================

-- Agregar tabla 'orders' a la publicación de realtime
ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.orders;

-- Verificar que se agregó correctamente
SELECT 
    schemaname, 
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime_messages_publication';

-- ============================================
-- 2. VERIFICAR POLÍTICAS RLS DE LA TABLA ORDERS
-- ============================================

-- Ver todas las políticas de la tabla orders
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
-- 3. VERIFICAR QUE RLS ESTÁ HABILITADO EN ORDERS
-- ============================================

SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'orders';

-- ============================================
-- 4. POLÍTICAS NECESARIAS PARA QUE EL RESTAURANTE 
--    PUEDA VER SUS PROPIOS PEDIDOS EN REALTIME
-- ============================================

-- Política para que el dueño del negocio vea sus pedidos
-- (Ejecutar solo si no existe)

CREATE POLICY "Business owners can view their orders" 
ON public.orders
FOR SELECT
TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid()
    )
);

-- Política para que el dueño del negocio reciba notificaciones de nuevos pedidos
-- (Ejecutar solo si no existe)

CREATE POLICY "Business owners can receive realtime notifications" 
ON public.orders
FOR ALL
TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid()
    )
);

-- ============================================
-- 5. VERIFICAR CONFIGURACIÓN FINAL
-- ============================================

-- Verificar que todo está configurado correctamente
SELECT 
    'Tabla en publicación' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime_messages_publication' 
            AND tablename = 'orders'
        ) THEN '✅ OK'
        ELSE '❌ FALTA'
    END as status

UNION ALL

SELECT 
    'RLS habilitado' as check_item,
    CASE 
        WHEN relrowsecurity THEN '✅ OK'
        ELSE '⚠️ DESHABILITADO (puede ser intencional)'
    END as status
FROM pg_class
WHERE relname = 'orders'

UNION ALL

SELECT 
    'Políticas existentes' as check_item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' políticas encontradas'
        ELSE '❌ No hay políticas'
    END as status
FROM pg_policies 
WHERE tablename = 'orders';
