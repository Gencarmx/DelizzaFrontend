-- ============================================
-- ELIMINAR POLÍTICA CON RECURSIÓN INFINITA
-- ============================================

-- ELIMINAR la política que causa recursión infinita
DROP POLICY IF EXISTS "Business owners can view customer profiles" ON profiles;

-- Verificar que se eliminó correctamente
SELECT 
    'Políticas restantes en profiles' as check_type,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
