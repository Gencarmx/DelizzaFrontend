-- =========================================
-- POLÍTICAS RLS PARA LA TABLA PRODUCTS
-- =========================================
-- Ejecutar en el SQL Editor de Supabase

-- 1. Habilitar RLS en la tabla products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 2. Política SELECT - Propietarios ven sus productos (activos e inactivos)
CREATE POLICY "Owners can view their own products" ON products
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses
    WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 3. Política SELECT - Clientes ven productos activos de restaurantes activos
CREATE POLICY "Clients can view active products from active businesses" ON products
FOR SELECT USING (
  active = true AND
  business_id IN (
    SELECT id FROM businesses WHERE active = true
  )
);

-- 4. Política INSERT - Solo propietarios pueden crear productos en sus restaurantes activos
CREATE POLICY "Owners can insert products for their businesses" ON products
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT id FROM businesses
    WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND active = true
  )
);

-- 5. Política UPDATE - Solo propietarios pueden actualizar sus productos
CREATE POLICY "Owners can update their own products" ON products
FOR UPDATE USING (
  business_id IN (
    SELECT id FROM businesses
    WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
) WITH CHECK (
  business_id IN (
    SELECT id FROM businesses
    WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 6. Política DELETE - Solo propietarios pueden eliminar sus productos
CREATE POLICY "Owners can delete their own products" ON products
FOR DELETE USING (
  business_id IN (
    SELECT id FROM businesses
    WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- =========================================
-- VERIFICACIÓN DE POLÍTICAS
-- =========================================

-- Verificar que las políticas estén activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

-- =========================================
-- TESTING DE POLÍTICAS (opcional)
-- =========================================

-- Para probar como propietario (reemplazar con IDs reales):
-- SELECT * FROM products WHERE business_id = 'your-business-id';

-- Para probar como cliente:
-- SELECT * FROM products WHERE active = true;

-- Para verificar que un propietario no ve productos de otros:
-- SELECT COUNT(*) FROM products; -- Debería mostrar solo los suyos
