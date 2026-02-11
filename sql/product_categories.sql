-- Paso 1: Crear tabla de categorías de productos
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50), -- Emoji o URL del icono
  description TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paso 2: Agregar constraint UNIQUE si no existe (ANTES de insertar datos)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_categories_name_key'
  ) THEN
    ALTER TABLE product_categories ADD CONSTRAINT product_categories_name_key UNIQUE (name);
  END IF;
END $$;

-- Paso 3: Crear índices
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(active);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON product_categories(sort_order);

-- Paso 4: Configurar RLS (Row Level Security)
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Paso 5: Eliminar políticas existentes si existen y recrearlas
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Allow full access to owners" ON product_categories;

-- Política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Allow read access to authenticated users" ON product_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir todas las operaciones a usuarios con rol 'owner'
CREATE POLICY "Allow full access to owners" ON product_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN collaborators c ON c.user_id = p.id
      WHERE p.user_id = auth.uid()
      AND c.role = 'owner'
      AND c.status = 'active'
    )
  );

-- Paso 6: Insertar categorías por defecto (DESPUÉS de crear el constraint UNIQUE)
INSERT INTO product_categories (name, icon, description, sort_order) VALUES
  ('Pizzas', '🍕', 'Deliciosas pizzas artesanales', 1),
  ('Bebidas', '🧋', 'Refrescantes bebidas y jugos', 2),
  ('Postres', '🍰', 'Tentadores postres y dulces', 3),
  ('Hamburguesas', '🍔', 'Jugosas hamburguesas gourmet', 4),
  ('Comida Mexicana', '🌮', 'Auténtica comida mexicana', 5),
  ('Ensaladas', '🥗', 'Saludables ensaladas frescas', 6),
  ('Sushi', '🍱', 'Exquisito sushi y comida japonesa', 7),
  ('Café', '☕', 'Café y bebidas calientes', 8)
ON CONFLICT (name) DO NOTHING;

-- Paso 7: Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe y recrearlo
DROP TRIGGER IF EXISTS trigger_update_product_categories_updated_at ON product_categories;

CREATE TRIGGER trigger_update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_product_categories_updated_at();
