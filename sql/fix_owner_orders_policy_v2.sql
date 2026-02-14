-- ============================================
-- SOLUCIÓN CORREGIDA: Política para OWNER del negocio
-- ============================================

-- NOTA: Según la nueva estructura, businesses.owner_id referencia a profiles.id
-- No a auth.users.id directamente. Por eso necesitamos hacer JOIN con profiles.

-- Política corregida para que el OWNER del negocio pueda ver sus pedidos
-- Conectando auth.uid() -> profiles.user_id -> businesses.owner_id
CREATE POLICY "Business owners can view their orders" 
ON public.orders
FOR SELECT
TO authenticated
USING (
    business_id IN (
        SELECT b.id 
        FROM public.businesses b
        JOIN public.profiles p ON b.owner_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- Verificar que la política se creó correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders'
AND policyname = 'Business owners can view their orders';
