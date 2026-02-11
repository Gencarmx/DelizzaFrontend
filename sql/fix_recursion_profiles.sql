-- ============================================================
-- URGENTE: Eliminar política con recursión infinita
-- ============================================================

-- 1. Eliminar la política problemática que causa recursión infinita
DROP POLICY IF EXISTS "profiles_restaurant_customers_select" ON profiles;

-- 2. Verificar que se eliminó
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 3. Test simple para verificar que ya no hay recursión
SELECT id, full_name, user_id 
FROM profiles 
WHERE user_id = '347861fe-d0c2-4da5-bd60-7e5138b9f3f0'
LIMIT 1;
