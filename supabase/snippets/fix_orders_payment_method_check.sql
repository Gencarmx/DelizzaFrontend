-- Fix: Agregar 'mercado_pago' como método de pago válido en la tabla orders
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('card', 'cash', 'mercado_pago'));
