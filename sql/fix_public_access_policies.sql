-- =========================================
-- AGREGAR POLÍTICAS DE ACCESO PÚBLICO
-- =========================================
-- Este script agrega políticas para permitir que usuarios
-- anónimos y autenticados puedan ver productos y restaurantes activos

-- =========================================
-- PASO 1: AGREGAR POLÍTICA PÚBLICA PARA PRODUCTS
-- =========================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Public can view active products" ON products;

-- Crear nueva política que permite a TODOS (public) ver productos activos
CREATE POLICY "Public can view active products"
ON products
FOR SELECT
TO public
USING (active = true);

-- =========================================
-- PASO 2: AGREGAR POLÍTICA PÚBLICA PARA BUSINESSES
-- =========================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Public can view active businesses" ON businesses;

-- Crear nueva política que permite a TODOS (public) ver restaurantes activos
CREATE POLICY "Public can view active businesses"
ON businesses
FOR SELECT
TO public
USING (active = true);

-- =========================================
-- VERIFICACIÓN
-- =========================================

-- Ver todas las políticas de products
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products'
ORDER BY cmd, policyname;

-- Ver todas las políticas de businesses
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'businesses'
ORDER BY cmd, policyname;
