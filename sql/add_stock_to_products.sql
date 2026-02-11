-- =========================================
-- AGREGAR COLUMNA STOCK A TABLA PRODUCTS
-- =========================================
-- Este script agrega la columna stock a la tabla products
-- Ejecutar en el SQL Editor de Supabase

-- Paso 1: Agregar columna stock si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'stock'
  ) THEN
    ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0 NOT NULL;
    RAISE NOTICE 'Columna stock agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna stock ya existe';
  END IF;
END $$;

-- Paso 2: Agregar constraint para que stock no sea negativo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_stock_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock >= 0);
    RAISE NOTICE 'Constraint products_stock_check agregado exitosamente';
  ELSE
    RAISE NOTICE 'El constraint products_stock_check ya existe';
  END IF;
END $$;

-- Paso 3: Crear índice para consultas por stock
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Paso 4: Actualizar productos existentes con stock por defecto (opcional)
-- Descomenta la siguiente línea si quieres que todos los productos existentes tengan stock 100
-- UPDATE products SET stock = 100 WHERE stock = 0;

-- =========================================
-- VERIFICACIÓN
-- =========================================

-- Ver la estructura de la tabla products
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Ver los constraints de la tabla
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'products'::regclass;
