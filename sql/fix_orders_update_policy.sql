-- Script para agregar política que permita a los owners actualizar pedidos
-- Ejecuta este script en el SQL Editor de Supabase
-- 
-- NOTA: La tabla collaborators está obsoleta. Ahora usamos profiles directamente.
-- Relación: businesses.owner_id → profiles.id → profiles.user_id = auth.uid()

-- Primero, eliminar la política obsoleta de collaborators si existe
DROP POLICY IF EXISTS "Business members can update orders" ON orders;

-- Agregar política para que los owners puedan actualizar pedidos de su negocio
CREATE POLICY "Business owners can update their business orders"
ON orders
FOR UPDATE
USING (
  business_id IN (
    SELECT b.id
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Verificar que la política se creó correctamente
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'orders'
AND pn.nspname = 'public'
AND pol.polname = 'Business owners can update their business orders';

-- Mostrar todas las políticas de UPDATE en orders
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'orders'
AND pn.nspname = 'public'
AND pol.polcmd = 'w'
ORDER BY pol.polname;
