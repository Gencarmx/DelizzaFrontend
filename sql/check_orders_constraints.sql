-- Script para ver las restricciones CHECK de la tabla orders
-- Ejecuta este script en el SQL Editor de Supabase

-- Ver todas las restricciones CHECK de la tabla orders
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'orders'
AND nsp.nspname = 'public'
AND con.contype = 'c'
ORDER BY con.conname;
