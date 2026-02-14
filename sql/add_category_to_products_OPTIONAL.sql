-- =========================================
-- AGREGAR COLUMNA CATEGORY_ID A TABLA PRODUCTS (OPCIONAL)
-- =========================================
-- Este script es OPCIONAL y solo debe ejecutarse si decides
-- vincular productos con la tabla product_categories
-- 
-- VENTAJAS de implementarlo:
-- 1. Categorías dinámicas: Los restaurantes pueden crear sus propias categorías
-- 2. Consistencia: Las categorías están centralizadas en la BD
-- 3. Filtrado eficiente: Puedes filtrar productos por categoría fácilmente
-- 4. Reportes: Puedes generar reportes por categoría
-- 5. Iconos: Cada categoría tiene su propio icono/emoji
--
-- DESVENTAJAS de NO implementarlo:
-- 1. Categorías hardcoded en el frontend (hamburguesas, pizzas, etc.)
-- 2. Todos los restaurantes tienen las mismas categorías
-- 3. No se pueden agregar categorías personalizadas
--
-- RECOMENDACIÓN: Implementar para producción, pero no es urgente
-- =========================================

-- Paso 1: Agregar columna category_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES product_categories(id);
    RAISE NOTICE 'Columna category_id agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna category_id ya existe';
  END IF;
END $$;

-- Paso 2: Crear índice para consultas por categoría
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Paso 3: Mapear productos existentes a categorías (OPCIONAL)
-- Este paso intenta asignar categorías basándose en palabras clave en el nombre del producto
-- Descomenta solo si quieres migrar productos existentes

/*
-- Mapear productos que contengan "pizza" a la categoría Pizzas
UPDATE products 
SET category_id = (SELECT id FROM product_categories WHERE name = 'Pizzas' LIMIT 1)
WHERE LOWER(name) LIKE '%pizza%' AND category_id IS NULL;

-- Mapear productos que contengan "hamburguesa" o "burger" a la categoría Hamburguesas
UPDATE products 
SET category_id = (SELECT id FROM product_categories WHERE name = 'Hamburguesas' LIMIT 1)
WHERE (LOWER(name) LIKE '%hamburguesa%' OR LOWER(name) LIKE '%burger%') AND category_id IS NULL;

-- Mapear productos que contengan "bebida" o "refresco" a la categoría Bebidas
UPDATE products 
SET category_id = (SELECT id FROM product_categories WHERE name = 'Bebidas' LIMIT 1)
WHERE (LOWER(name) LIKE '%bebida%' OR LOWER(name) LIKE '%refresco%' OR LOWER(name) LIKE '%jugo%') AND category_id IS NULL;

-- Mapear productos que contengan "postre" o "pastel" a la categoría Postres
UPDATE products 
SET category_id = (SELECT id FROM product_categories WHERE name = 'Postres' LIMIT 1)
WHERE (LOWER(name) LIKE '%postre%' OR LOWER(name) LIKE '%pastel%' OR LOWER(name) LIKE '%helado%') AND category_id IS NULL;
*/

-- =========================================
-- VERIFICACIÓN
-- =========================================

-- Ver productos con sus categorías
SELECT 
  p.id,
  p.name AS product_name,
  pc.name AS category_name,
  pc.icon AS category_icon
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
ORDER BY pc.name, p.name;

-- Contar productos por categoría
SELECT 
  pc.name AS category,
  pc.icon,
  COUNT(p.id) AS total_products
FROM product_categories pc
LEFT JOIN products p ON p.category_id = pc.id
GROUP BY pc.id, pc.name, pc.icon
ORDER BY total_products DESC;
