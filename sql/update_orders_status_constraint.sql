-- Script para actualizar la restricción CHECK de status en la tabla orders
-- Ejecuta este script en el SQL Editor de Supabase

-- Primero, eliminar la restricción CHECK existente
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Crear la nueva restricción CHECK con los estados adicionales
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text,
  'accepted'::text,
  'confirmed'::text,
  'preparing'::text,
  'ready'::text,
  'in_progress'::text,
  'delivered'::text,
  'completed'::text,
  'cancelled'::text
]));

-- Verificar que la restricción se actualizó correctamente
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'orders'
AND nsp.nspname = 'public'
AND con.contype = 'c'
AND con.conname = 'orders_status_check';
