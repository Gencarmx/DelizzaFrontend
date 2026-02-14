-- =========================================
-- DIAGNÓSTICO COMPLETO DE BASE DE DATOS SUPABASE
-- =========================================
-- Ejecutar este script en el SQL Editor de Supabase para obtener
-- información completa sobre la estructura de la base de datos

-- =========================================
-- 1. ESTRUCTURA DE TODAS LAS TABLAS
-- =========================================

-- Todas las columnas de todas las tablas
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =========================================
-- 2. RELACIONES ENTRE TABLAS (FOREIGN KEYS)
-- =========================================

SELECT 
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =========================================
-- 3. TODAS LAS TABLAS CON METADATOS
-- =========================================

SELECT 
  c.relname AS table_name,
  pg_catalog.obj_description(c.oid, 'pg_class') AS table_comment,
  pg_catalog.pg_size_pretty(pg_catalog.pg_table_size(c.oid)) AS table_size,
  c.reltuples::bigint AS estimated_rows
FROM pg_catalog.pg_class c
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY c.relname;

-- =========================================
-- 4. POLÍTICAS RLS DE TODAS LAS TABLAS
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

-- =========================================
-- 5. ESTADO DE RLS EN TODAS LAS TABLAS
-- =========================================

SELECT 
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY c.relname;

-- =========================================
-- 6. TODOS LOS TRIGGERS
-- =========================================

SELECT 
  n.nspname as schema_name,
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- =========================================
-- 7. TODAS LAS FUNCIONES/PROCEDIMIENTOS
-- =========================================

SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  CASE 
    WHEN p.prokind = 'f' THEN 'FUNCTION'
    WHEN p.prokind = 'p' THEN 'PROCEDURE'
    WHEN p.prokind = 'a' THEN 'AGGREGATE'
    WHEN p.prokind = 'w' THEN 'WINDOW'
  END as function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- =========================================
-- 8. ÍNDICES DE TODAS LAS TABLAS
-- =========================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =========================================
-- 9. RESTRICCIONES DE TODAS LAS TABLAS
-- =========================================

SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- =========================================
-- 10. RESUMEN EJECUTIVO
-- =========================================

SELECT 
  'Tablas' as categoria,
  COUNT(*) as total
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Políticas RLS' as categoria,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Triggers' as categoria,
  COUNT(*) as total
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND NOT t.tgisinternal

UNION ALL

SELECT 
  'Funciones' as categoria,
  COUNT(*) as total
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'

UNION ALL

SELECT 
  'Índices' as categoria,
  COUNT(*) as total
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Foreign Keys' as categoria,
  COUNT(*) as total
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'

ORDER BY categoria;
