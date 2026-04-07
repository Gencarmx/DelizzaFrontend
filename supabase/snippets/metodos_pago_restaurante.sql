-- Migración: Métodos de pago por restaurante
-- Ejecutar en el SQL Editor de Supabase

-- 1. Agregar columnas a la tabla businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS accepted_payment_methods text[]
    NOT NULL DEFAULT ARRAY['cash'],
  ADD COLUMN IF NOT EXISTS mercado_pago_link text;

-- 2. Restricción: al menos un método debe estar presente
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_payment_methods_not_empty;
ALTER TABLE businesses
  ADD CONSTRAINT businesses_payment_methods_not_empty
    CHECK (cardinality(accepted_payment_methods) > 0);

-- 3. Restricción: solo valores válidos
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_payment_methods_valid;
ALTER TABLE businesses
  ADD CONSTRAINT businesses_payment_methods_valid
    CHECK (accepted_payment_methods <@ ARRAY['cash', 'mercado_pago']);

-- Verificar que los restaurantes existentes quedan con el default correcto
-- (todos tendrán ['cash'] por defecto al ejecutar la migración)
SELECT id, name, accepted_payment_methods, mercado_pago_link
FROM businesses
LIMIT 5;
