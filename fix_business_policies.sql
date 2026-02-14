-- =====================================================
-- SOLUCIÓN: CORREGIR POLÍTICA DE UPDATE
-- =====================================================

-- 1. ELIMINAR la política incorrecta
DROP POLICY IF EXISTS "Owners can update businesses" ON businesses;

-- 2. CREAR la política correcta
-- Esta política verifica que el owner_id del negocio corresponda
-- al profile.id del usuario autenticado
CREATE POLICY "Owners can update businesses"
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

-- 3. VERIFICAR que la política se creó correctamente
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

-- =====================================================
-- TAMBIÉN CORREGIR LA POLÍTICA DE DELETE (tiene el mismo problema)
-- =====================================================

-- 1. ELIMINAR la política incorrecta de DELETE
DROP POLICY IF EXISTS "Owners can delete businesses" ON businesses;

-- 2. CREAR la política correcta de DELETE
CREATE POLICY "Owners can delete businesses"
ON businesses
FOR DELETE
TO authenticated
USING (
    owner_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);

-- 3. VERIFICAR todas las políticas de businesses
SELECT 
    policyname AS "Política",
    cmd AS "Operación",
    roles AS "Roles",
    CASE 
        WHEN cmd = 'SELECT' THEN 'Lectura'
        WHEN cmd = 'INSERT' THEN 'Inserción'
        WHEN cmd = 'UPDATE' THEN 'Actualización'
        WHEN cmd = 'DELETE' THEN 'Eliminación'
        ELSE cmd
    END AS "Tipo"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'businesses'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;
