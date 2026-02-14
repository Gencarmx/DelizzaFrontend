-- ============================================
-- VERIFICACIÓN URGENTE: ACCESO A RESTAURANTES
-- ============================================

-- 1. Verificar políticas RLS para businesses
SELECT 
    'POLÍTICAS BUSINESSES' as check_type,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'businesses'
ORDER BY policyname;

-- 2. Verificar si RLS está habilitado en businesses
SELECT 
    'RLS STATUS' as check_type,
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'businesses';

-- 3. Verificar que el usuario tiene un perfil de owner
-- (Reemplaza 'USER_ID_AQUI' con el ID del usuario auth.uid())
/*
SELECT 
    'PERFIL DEL USUARIO' as check_type,
    p.id,
    p.full_name,
    p.role,
    p.user_id
FROM profiles p
WHERE p.user_id = 'USER_ID_AQUI';
*/

-- 4. Verificar que el owner tiene un negocio asignado
-- (Reemplaza 'PROFILE_ID_AQUI' con el id del perfil)
/*
SELECT 
    'NEGOCIOS DEL OWNER' as check_type,
    b.id as business_id,
    b.name,
    b.owner_id
FROM businesses b
WHERE b.owner_id = 'PROFILE_ID_AQUI';
*/

-- 5. Verificar todas las políticas de profiles (para ver si algo cambió)
SELECT 
    'POLÍTICAS PROFILES' as check_type,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Verificar si hay algún error en las políticas
SELECT 
    'ESTADO GENERAL' as check_type,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('businesses', 'profiles', 'orders');
