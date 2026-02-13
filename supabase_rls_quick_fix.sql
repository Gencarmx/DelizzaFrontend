-- =====================================================
-- SOLUCIÓN RÁPIDA - POLÍTICAS RLS SIMPLIFICADAS
-- =====================================================
-- Esta es una versión simplificada que puedes ejecutar directamente
-- en el SQL Editor de Supabase
-- =====================================================

-- PASO 1: Eliminar políticas antiguas
DROP POLICY IF EXISTS "Business members can manage hours" ON business_hours;
DROP POLICY IF EXISTS "Anyone can view business hours" ON business_hours;

-- PASO 2: Crear política simple para dueños (cubre SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Owners manage their business hours"
ON business_hours
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE b.id = business_hours.business_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE b.id = business_hours.business_id
      AND p.user_id = auth.uid()
  )
);

-- PASO 3: Crear política de lectura pública
CREATE POLICY "Public can view active hours"
ON business_hours
FOR SELECT
TO public
USING (
  active = true 
  AND EXISTS (
    SELECT 1 
    FROM businesses 
    WHERE id = business_hours.business_id 
      AND active = true
  )
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar las políticas:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'business_hours';
