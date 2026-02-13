-- =====================================================
-- DIAGNOSTICAR PROBLEMA DE ACTUALIZACIÓN DE BUSINESSES
-- =====================================================

-- 1. Verificar si el negocio existe
SELECT 
    id,
    name,
    owner_id,
    address,
    logo_url,
    active,
    created_at,
    updated_at
FROM businesses
WHERE id = 'c150bc32-75e6-49ba-b5be-4cf0226ae6e2';

-- 2. Ver tu user_id actual
SELECT auth.uid() AS "Mi User ID";

-- 3. Ver tu perfil
SELECT 
    id AS profile_id,
    user_id,
    full_name,
    role
FROM profiles 
WHERE user_id = auth.uid();

-- 4. Verificar la relación entre tu usuario y el negocio
SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    p.id AS profile_id,
    p.user_id,
    p.full_name,
    CASE 
        WHEN p.user_id = auth.uid() THEN 'SÍ - Eres el dueño'
        ELSE 'NO - No eres el dueño'
    END AS "¿Puedes actualizar?"
FROM businesses b
LEFT JOIN profiles p ON p.id = b.owner_id
WHERE b.id = 'c150bc32-75e6-49ba-b5be-4cf0226ae6e2';

-- 5. Ver TODAS las políticas RLS de la tabla businesses
SELECT 
    schemaname,
    tablename,
    policyname AS "Nombre de Política",
    permissive AS "Permisiva",
    roles AS "Roles",
    cmd AS "Operación",
    qual AS "Condición USING",
    with_check AS "Condición WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'businesses'
ORDER BY cmd, policyname;

-- 6. Verificar si RLS está habilitado en la tabla businesses
SELECT 
    schemaname,
    tablename,
    rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'businesses';

-- 7. Intentar actualizar directamente (para ver el error específico)
-- NOTA: Reemplaza los valores según sea necesario
UPDATE businesses
SET 
    name = 'JojosPizza',
    address = 'Calle 15',
    logo_url = 'https://czaiyunauxgfvdmvqxsw.supabase.co/storage/v1/object/public/business-logos/c150bc32-75e6-49ba-b5be-4cf0226ae6e2/logo.jpeg',
    updated_at = NOW()
WHERE id = 'c150bc32-75e6-49ba-b5be-4cf0226ae6e2'
RETURNING *;

-- =====================================================
-- POSIBLES SOLUCIONES
-- =====================================================

-- SOLUCIÓN 1: Si no existe política de UPDATE, crearla
-- Ejecuta esto SOLO si no hay política de UPDATE para businesses

CREATE POLICY "Owners can update their businesses"
ON businesses
FOR UPDATE
TO authenticated
USING (
    owner_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    owner_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);

-- SOLUCIÓN 2: Si la política existe pero está mal configurada, eliminarla y recrearla
-- DROP POLICY IF EXISTS "Owners can update their businesses" ON businesses;
-- Luego ejecuta la política de SOLUCIÓN 1

-- =====================================================
-- VERIFICACIÓN POST-SOLUCIÓN
-- =====================================================

-- Verificar que la política se creó correctamente
SELECT 
    policyname AS "Política",
    cmd AS "Operación",
    roles AS "Roles",
    qual AS "Condición USING",
    with_check AS "Condición WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'businesses'
  AND cmd = 'UPDATE';

-- Probar la actualización nuevamente
UPDATE businesses
SET updated_at = NOW()
WHERE id = 'c150bc32-75e6-49ba-b5be-4cf0226ae6e2'
RETURNING id, name, updated_at;
