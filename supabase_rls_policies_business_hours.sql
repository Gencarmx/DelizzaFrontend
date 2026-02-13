-- =====================================================
-- POLÍTICAS RLS PARA TABLA business_hours
-- =====================================================
-- Este archivo contiene las políticas de seguridad a nivel de fila (RLS)
-- para la tabla business_hours, corrigiendo el problema de dependencia
-- con la tabla collaborators que ha sido descontinuada.
-- =====================================================

-- Paso 1: Eliminar las políticas antiguas que dependen de collaborators
DROP POLICY IF EXISTS "Business members can manage hours" ON public.business_hours;
DROP POLICY IF EXISTS "Anyone can view business hours" ON public.business_hours;

-- =====================================================
-- POLÍTICAS DE LECTURA (SELECT)
-- =====================================================

-- Política 1: Cualquier persona puede ver los horarios activos de negocios activos
CREATE POLICY "Public can view active business hours"
ON public.business_hours
FOR SELECT
TO public
USING (
  active = true 
  AND business_id IN (
    SELECT id 
    FROM businesses 
    WHERE active = true
  )
);

-- Política 2: Los dueños pueden ver todos los horarios de sus negocios (activos e inactivos)
CREATE POLICY "Owners can view their business hours"
ON public.business_hours
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT b.id
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- =====================================================
-- POLÍTICAS DE INSERCIÓN (INSERT)
-- =====================================================

-- Política 3: Los dueños pueden insertar horarios en sus negocios
CREATE POLICY "Owners can insert business hours"
ON public.business_hours
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT b.id
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
      AND b.active = true
  )
);

-- =====================================================
-- POLÍTICAS DE ACTUALIZACIÓN (UPDATE)
-- =====================================================

-- Política 4: Los dueños pueden actualizar horarios de sus negocios
CREATE POLICY "Owners can update business hours"
ON public.business_hours
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT b.id
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- =====================================================
-- POLÍTICAS DE ELIMINACIÓN (DELETE)
-- =====================================================

-- Política 5: Los dueños pueden eliminar horarios de sus negocios
CREATE POLICY "Owners can delete business hours"
ON public.business_hours
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT b.id
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- =====================================================
-- VERIFICACIÓN DE POLÍTICAS
-- =====================================================
-- Para verificar que las políticas se crearon correctamente, ejecuta:
-- SELECT * FROM pg_policies WHERE tablename = 'business_hours';

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Estas políticas asumen que:
--    - La tabla 'profiles' tiene una columna 'user_id' que referencia a auth.users
--    - La tabla 'businesses' tiene una columna 'owner_id' que referencia a profiles.id
--    - El usuario autenticado tiene un perfil en la tabla 'profiles'
--
-- 2. Las políticas permiten:
--    - Lectura pública de horarios activos
--    - Gestión completa (CRUD) para los dueños de negocios
--
-- 3. Si necesitas agregar colaboradores en el futuro, puedes crear
--    políticas adicionales sin eliminar estas.
-- =====================================================
