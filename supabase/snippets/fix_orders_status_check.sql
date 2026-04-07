-- ============================================================================
-- FIX: Agregar 'awaiting_payment' al check constraint de orders.status
--
-- El constraint original no incluye 'awaiting_payment', lo que causa el error:
--   "new row for relation "orders" violates check constraint "orders_status_check""
-- al intentar cambiar el estado de un pedido a "Esperando pago".
--
-- INSTRUCCIONES:
--   1. Abre el SQL Editor en tu proyecto de Supabase.
--   2. Pega y ejecuta este script.
-- ============================================================================

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'awaiting_payment',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled'
  ));
