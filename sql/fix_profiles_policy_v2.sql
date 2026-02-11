-- ============================================
-- CORREGIR POLÍTICA RLS DE PROFILES - VERSIÓN 2
-- ============================================

-- ELIMINAR la política problemática
DROP POLICY IF EXISTS "Business owners can view customer profiles" ON profiles;

-- RECREAR con lógica correcta: permitir ver propio perfil O perfiles de clientes con pedidos
CREATE POLICY "Business owners can view customer profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    -- Condición 1: El usuario puede ver SU PROPIO perfil
    user_id = auth.uid()
    
    -- Condición 2: O puede ver perfiles de clientes que han hecho pedidos a su negocio
    OR EXISTS (
        SELECT 1 
        FROM orders o
        JOIN businesses b ON b.id = o.business_id
        WHERE o.customer_id = profiles.id
        AND b.owner_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1
        )
    )
);

-- Verificar que la política se creó correctamente
SELECT 
    'POLÍTICA ACTUALIZADA' as check_type,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Business owners can view customer profiles';
