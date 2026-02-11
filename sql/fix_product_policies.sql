-- =========================================
-- SCRIPT PARA CORREGIR POLÍTICAS RLS DE PRODUCTS
-- =========================================
-- Este script elimina las políticas incorrectas y crea las correctas
-- Ejecutar en el SQL Editor de Supabase

-- Paso 1: Eliminar TODAS las políticas existentes de products
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Business members can manage products" ON products;
DROP POLICY IF EXISTS "Owners can view their own products" ON products;
DROP POLICY IF EXISTS "Clients can view active products from active businesses" ON products;
DROP POLICY IF EXISTS "Owners can insert products for their businesses" ON products;
DROP POLICY IF EXISTS "Owners can update their own products" ON products;
DROP POLICY IF EXISTS "Owners can delete their own products" ON products;

-- Paso 2: Asegurar que RLS esté habilitado
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Paso 3: Crear políticas correctas

-- Política SELECT para PROPIETARIOS - Ver todos sus productos (activos e inactivos)
CREATE POLICY "Owners can view their own products" ON products
FOR SELECT 
TO authenticated
USING (
  business_id IN (
    SELECT b.id 
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Política SELECT para CLIENTES - Ver solo productos activos de negocios activos
CREATE POLICY "Clients can view active products" ON products
FOR SELECT 
TO authenticated
USING (
  active = true AND
  business_id IN (
    SELECT id FROM businesses WHERE active = true
  )
);

-- Política INSERT - Solo propietarios pueden crear productos en sus restaurantes
CREATE POLICY "Owners can insert products" ON products
FOR INSERT 
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT b.id 
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
    AND b.active = true
  )
);

-- Política UPDATE - Solo propietarios pueden actualizar sus productos
CREATE POLICY "Owners can update products" ON products
FOR UPDATE 
TO authenticated
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

-- Política DELETE - Solo propietarios pueden eliminar sus productos
CREATE POLICY "Owners can delete products" ON products
FOR DELETE 
TO authenticated
USING (
  business_id IN (
    SELECT b.id 
    FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- =========================================
-- VERIFICACIÓN
-- =========================================

-- Ver todas las políticas de products
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'products'
ORDER BY cmd, policyname;

-- Resultado esperado: 5 políticas
-- 1. Owners can view their own products (SELECT)
-- 2. Clients can view active products (SELECT)
-- 3. Owners can insert products (INSERT)
-- 4. Owners can update products (UPDATE)
-- 5. Owners can delete products (DELETE)
