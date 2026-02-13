-- =====================================================
-- FIX: Agregar generación automática de UUID para business_hours.id
-- =====================================================
-- Este script corrige el problema de "null value in column id"
-- agregando un valor por defecto UUID a la columna id
-- =====================================================

-- Verificar el estado actual de la columna id
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'business_hours' 
  AND column_name = 'id';

-- Agregar valor por defecto UUID a la columna id
ALTER TABLE business_hours 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verificar que el cambio se aplicó correctamente
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'business_hours' 
  AND column_name = 'id';

-- =====================================================
-- NOTA: Después de ejecutar este script, la columna id
-- generará automáticamente un UUID cuando se inserten
-- nuevos registros sin especificar el id
-- =====================================================
