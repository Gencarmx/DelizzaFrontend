-- Script para revisar las políticas RLS de la tabla orders
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Ver todas las políticas de la tabla orders
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
WHERE tablename = 'orders'
ORDER BY policyname;

-- 2. Ver si RLS está habilitado en la tabla orders
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'orders';

-- 3. Ver información detallada de las políticas
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    CASE pol.polpermissive
        WHEN true THEN 'PERMISSIVE'
        WHEN false THEN 'RESTRICTIVE'
    END AS type,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'orders'
AND pn.nspname = 'public'
ORDER BY pol.polname;
