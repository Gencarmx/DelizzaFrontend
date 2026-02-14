-- =========================================
-- SOLUCIÓN COMPLETA PARA ACCESO PÚBLICO
-- =========================================
-- Este script corrige las políticas RLS para permitir que
-- clientes y usuarios anónimos puedan ver productos y restaurantes activos

-- =========================================
-- PASO 1: AGREGAR POLÍTICA PÚBLICA PARA PRODUCTS
-- =========================================

-- Eliminar política restrictiva si existe
DROP POLICY IF EXISTS "Public can view active products" ON products;

-- Crear política que permite a TODOS ver productos activos
CREATE POLICY "Public can view active products"
ON products
FOR SELECT
TO public
USING (active = true);

-- =========================================
-- PASO 2: AGREGAR POLÍTICA PÚBLICA PARA BUSINESSES
-- =========================================

-- Eliminar política restrictiva si existe
DROP POLICY IF EXISTS "Public can view active businesses" ON businesses;

-- Crear política que permite a TODOS ver restaurantes activos
CREATE POLICY "Public can view active businesses"
ON businesses
FOR SELECT
TO public
USING (active = true);

-- =========================================
-- PASO 3: VERIFICACIÓN
-- =========================================

-- Ver políticas de products
SELECT 
  policyname,
  roles,
  cmd,
  CASE 
    WHEN LENGTH(qual) > 100 THEN LEFT(qual, 100) || '...'
    ELSE qual
  END as qual_preview
FROM pg_policies
WHERE tablename = 'products'
ORDER BY cmd, policyname;

-- Ver políticas de businesses
SELECT 
  policyname,
  roles,
  cmd,
  CASE 
    WHEN LENGTH(qual) > 100 THEN LEFT(qual, 100) || '...'
    ELSE qual
  END as qual_preview
FROM pg_policies
WHERE tablename = 'businesses'
ORDER BY cmd, policyname;

-- =========================================
-- PASO 4: PRUEBA DE ACCESO
-- =========================================

-- Probar que se pueden ver productos activos
SELECT 
  'TEST: Products' as test_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE active = true) as active_records
FROM products;

-- Probar que se pueden ver restaurantes activos
SELECT 
  'TEST: Businesses' as test_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE active = true) as active_records
FROM businesses;

-- =========================================
-- NOTAS IMPORTANTES
-- =========================================

/*
SEGURIDAD:
- ✅ Solo muestra productos/restaurantes con active = true
- ✅ Los dueños mantienen sus políticas para CRUD (INSERT, UPDATE, DELETE)
- ✅ Los clientes solo pueden VER (SELECT), no modificar
- ✅ RLS sigue activo y protegiendo los datos

COMPATIBILIDAD:
- ✅ No afecta políticas existentes de owners
- ✅ No afecta triggers ni funciones
- ✅ Compatible con la estructura actual
- ✅ Listo para producción

RENDIMIENTO:
- ✅ Consulta simple: solo verifica active = true
- ✅ No requiere JOINs complejos
- ✅ Usa índices existentes (idx_products_business_active)
- ✅ Rápido y eficiente
*/
