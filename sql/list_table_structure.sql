-- =========================================
-- LISTAR ESTRUCTURA COMPLETA DE TABLAS
-- =========================================

-- Ver todas las columnas de todas las tablas
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
-- VER RELACIONES ENTRE TABLAS (FOREIGN KEYS)
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
-- VER TODAS LAS TABLAS CON SUS COMENTARIOS
-- =========================================

SELECT 
  c.relname AS table_name,
  pg_catalog.obj_description(c.oid, 'pg_class') AS table_comment,
  pg_catalog.pg_size_pretty(pg_catalog.pg_table_size(c.oid)) AS table_size
FROM pg_catalog.pg_class c
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY c.relname;
