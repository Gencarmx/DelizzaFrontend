-- ============================================
-- SOLUCIÓN: Agregar política para OWNER del negocio
-- ============================================

-- El problema: Las políticas actuales verifican la tabla 'collaborators'
-- pero el OWNER del negocio está en 'businesses.owner_id', no en collaborators

-- Esta política permite que el OWNER vea los pedidos de su propio negocio
CREATE POLICY "Business owners can view their orders" 
ON public.orders
FOR SELECT
TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid()
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
