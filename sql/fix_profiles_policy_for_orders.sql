-- ============================================
-- POLÍTICA RLS PARA QUE RESTAURANTES VEAN PERFILES DE CLIENTES
-- ============================================

-- Eliminar política existente si hay conflicto
DROP POLICY IF EXISTS "Business owners can view customer profiles" ON profiles;

-- Crear política para que los owners vean perfiles de clientes con pedidos
CREATE POLICY "Business owners can view customer profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    -- El usuario puede ver su propio perfil (ya cubierto por otras políticas)
    -- O puede ver perfiles de clientes que han hecho pedidos a su negocio
    EXISTS (
        SELECT 1 
        FROM orders o
        JOIN businesses b ON b.id = o.business_id
        WHERE o.customer_id = profiles.id
        AND b.owner_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    )
);

-- Verificar que la política se creó correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Business owners can view customer profiles';
