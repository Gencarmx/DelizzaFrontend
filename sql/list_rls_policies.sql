-- =========================================
-- LISTAR POLÍTICAS RLS DE UNA TABLA
-- =========================================
-- Este script muestra todas las políticas RLS de una tabla específica

-- Para ver políticas de la tabla PRODUCTS:
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
WHERE tablename = 'products'
ORDER BY cmd, policyname;

-- Para ver políticas de la tabla BUSINESSES:
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
WHERE tablename = 'businesses'
ORDER BY cmd, policyname;

-- =========================================
-- VERIFICAR SI RLS ESTÁ HABILITADO
-- =========================================

-- Ver si RLS está habilitado en products
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('products', 'businesses')
  AND schemaname = 'public';

-- =========================================
-- VER TODAS LAS POLÍTICAS DE TODAS LAS TABLAS
-- =========================================

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
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
