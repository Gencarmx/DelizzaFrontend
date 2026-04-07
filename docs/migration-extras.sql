-- ============================================================================
-- MIGRACIÓN: Sistema de Extras/Adiciones para Productos
-- Proyecto: Delizza
-- Fecha: 2026-03-31
--
-- INSTRUCCIONES:
--   1. Abre el SQL Editor en tu proyecto de Supabase.
--   2. Pega y ejecuta este script completo en un solo bloque.
--   3. Luego actualiza create_order_with_items según la sección al final.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 1: Agregar columna has_addons a la tabla products
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_addons BOOLEAN NOT NULL DEFAULT false;

-- Índice parcial: solo indexa filas donde hay addons (muy liviano)
CREATE INDEX IF NOT EXISTS idx_products_has_addons
  ON products(business_id, has_addons)
  WHERE has_addons = true;


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 2: Crear tabla product_addons
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_addons (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_name TEXT         NOT NULL,
  name          TEXT         NOT NULL,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  max_quantity  INTEGER      NOT NULL DEFAULT 1 CHECK (max_quantity >= 1),
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  active        BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_addons_product_id
  ON product_addons(product_id);

-- Índice compuesto para la query de clientes (activos, ordenados)
CREATE INDEX IF NOT EXISTS idx_product_addons_active_order
  ON product_addons(product_id, active, sort_order);


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 3: Row Level Security en product_addons
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;

-- Clientes y usuarios anónimos: solo addons activos de productos activos
CREATE POLICY "Public can view active product addons"
  ON product_addons FOR SELECT
  USING (
    active = true
    AND product_id IN (
      SELECT id FROM products WHERE active = true
    )
  );

-- Subquery reutilizable: productos que el usuario autenticado puede gestionar.
-- Usa owner_id → profiles.id → profiles.user_id = auth.uid() (no owner_user_id,
-- que es nullable y causaría que la condición evalúe a NULL en lugar de false).

CREATE POLICY "Restaurants can view own product addons"
  ON product_addons FOR SELECT
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN businesses b ON p.business_id = b.id
      JOIN profiles pr ON b.owner_id = pr.id
      WHERE pr.user_id = auth.uid()
      UNION
      SELECT p.id FROM products p
      JOIN collaborators c ON p.business_id = c.business_id
      JOIN profiles pr ON c.user_id = pr.id
      WHERE pr.user_id = auth.uid()
        AND c.active = true
    )
  );

CREATE POLICY "Restaurants can insert own product addons"
  ON product_addons FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      JOIN businesses b ON p.business_id = b.id
      JOIN profiles pr ON b.owner_id = pr.id
      WHERE pr.user_id = auth.uid()
      UNION
      SELECT p.id FROM products p
      JOIN collaborators c ON p.business_id = c.business_id
      JOIN profiles pr ON c.user_id = pr.id
      WHERE pr.user_id = auth.uid()
        AND c.active = true
    )
  );

CREATE POLICY "Restaurants can update own product addons"
  ON product_addons FOR UPDATE
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN businesses b ON p.business_id = b.id
      JOIN profiles pr ON b.owner_id = pr.id
      WHERE pr.user_id = auth.uid()
      UNION
      SELECT p.id FROM products p
      JOIN collaborators c ON p.business_id = c.business_id
      JOIN profiles pr ON c.user_id = pr.id
      WHERE pr.user_id = auth.uid()
        AND c.active = true
    )
  );

CREATE POLICY "Restaurants can delete own product addons"
  ON product_addons FOR DELETE
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN businesses b ON p.business_id = b.id
      JOIN profiles pr ON b.owner_id = pr.id
      WHERE pr.user_id = auth.uid()
      UNION
      SELECT p.id FROM products p
      JOIN collaborators c ON p.business_id = c.business_id
      JOIN profiles pr ON c.user_id = pr.id
      WHERE pr.user_id = auth.uid()
        AND c.active = true
    )
  );

-- Permisos de tabla para los roles de Supabase.
-- Las tablas creadas via SQL Editor no reciben grants automáticos
-- (a diferencia del Table Editor). Sin estos grants, las operaciones
-- de escritura fallan con error 42501 aunque las políticas RLS sean correctas.
GRANT SELECT, INSERT, UPDATE, DELETE ON product_addons TO authenticated;
GRANT SELECT                         ON product_addons TO anon;


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 4: Triggers
-- ────────────────────────────────────────────────────────────────────────────

-- 4a. Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_product_addons_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_product_addons_updated_at ON product_addons;
CREATE TRIGGER trigger_product_addons_updated_at
  BEFORE UPDATE ON product_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_product_addons_updated_at();

-- 4b. Sincronizar products.has_addons cuando cambian los addons
CREATE OR REPLACE FUNCTION sync_product_has_addons()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_product_id UUID;
BEGIN
  target_product_id := CASE TG_OP WHEN 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;

  UPDATE products
  SET has_addons = EXISTS (
    SELECT 1 FROM product_addons
    WHERE product_id = target_product_id
      AND active = true
    LIMIT 1
  )
  WHERE id = target_product_id;

  RETURN NULL; -- AFTER trigger: valor de retorno ignorado para ROW triggers
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_product_has_addons ON product_addons;
CREATE TRIGGER trigger_sync_product_has_addons
  AFTER INSERT OR UPDATE OR DELETE ON product_addons
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_has_addons();


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 5: Funciones RPC
-- ────────────────────────────────────────────────────────────────────────────

-- 5a. Addons agrupados por categoría — para el modal del cliente (1 roundtrip)
CREATE OR REPLACE FUNCTION get_product_addons_grouped(p_product_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', category_name,
        'addons',   addons
      )
      ORDER BY min_sort
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      category_name,
      MIN(sort_order) AS min_sort,
      jsonb_agg(
        jsonb_build_object(
          'id',           id,
          'name',         name,
          'price',        price,
          'max_quantity', max_quantity,
          'sort_order',   sort_order
        )
        ORDER BY sort_order
      ) AS addons
    FROM product_addons
    WHERE product_id = p_product_id
      AND active = true
    GROUP BY category_name
  ) grouped;
$$;

-- 5b. Addons activos de múltiples productos — batch para admin/listado
CREATE OR REPLACE FUNCTION get_products_addons(p_product_ids UUID[])
RETURNS TABLE (product_id UUID, addons JSONB)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pa.product_id,
    jsonb_agg(
      jsonb_build_object(
        'id',            pa.id,
        'category_name', pa.category_name,
        'name',          pa.name,
        'price',         pa.price,
        'max_quantity',  pa.max_quantity,
        'sort_order',    pa.sort_order
      )
      ORDER BY pa.sort_order
    ) AS addons
  FROM product_addons pa
  WHERE pa.product_id = ANY(p_product_ids)
    AND pa.active = true
  GROUP BY pa.product_id;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 6: Agregar columna addons a order_items (para tickets de cocina)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS addons JSONB;

-- Ejemplo de valor que se almacenará:
-- [{"name": "Camarones", "price": 45.00, "quantity": 1},
--  {"name": "Bolognesa", "price": 10.00, "quantity": 1}]


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 7: Actualizar create_order_with_items para persistir addons
-- ────────────────────────────────────────────────────────────────────────────
--
-- Único cambio respecto a la versión actual: el INSERT de order_items
-- ahora incluye la columna `addons` (agregada en PASO 6).
-- El resto del cuerpo (validaciones, transacción, EXCEPTION) es idéntico.
--
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_business_id    UUID,
  p_customer_id    UUID,
  p_customer_name  TEXT,
  p_total          NUMERIC,
  p_delivery_type  TEXT,
  p_payment_method TEXT,
  p_items          JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id   UUID;
  v_created_at TIMESTAMPTZ;
  v_item       JSONB;
BEGIN
  -- Validaciones básicas
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id es requerido';
  END IF;
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id es requerido';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe contener al menos un item';
  END IF;
  IF p_delivery_type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'delivery_type inválido: %', p_delivery_type;
  END IF;
  IF p_payment_method NOT IN ('card', 'cash', 'mercado_pago') THEN
    RAISE EXCEPTION 'payment_method inválido: %', p_payment_method;
  END IF;

  -- 1. Insertar la orden
  INSERT INTO orders (
    business_id, customer_id, customer_name,
    status, total, delivery_type, payment_method
  )
  VALUES (
    p_business_id, p_customer_id, p_customer_name,
    'pending', p_total, p_delivery_type, p_payment_method
  )
  RETURNING id, created_at INTO v_order_id, v_created_at;

  -- 2. Insertar los items — ahora incluye la columna addons
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, product_name,
      price, quantity, addons
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'price')::NUMERIC,
      (v_item->>'quantity')::INTEGER,
      CASE
        WHEN v_item->'addons' IS NOT NULL
          AND v_item->>'addons' != 'null'
          AND jsonb_array_length(v_item->'addons') > 0
        THEN (v_item->'addons')::JSONB
        ELSE NULL
      END
    );
  END LOOP;

  -- 3. Retornar el resultado al cliente
  RETURN jsonb_build_object(
    'order_id',   v_order_id,
    'created_at', v_created_at
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando pedido: % — %', SQLERRM, SQLSTATE;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- PASO 8: RPC SECURITY DEFINER para escritura de addons
-- ────────────────────────────────────────────────────────────────────────────
--
-- Las políticas RLS con subqueries complejas (múltiples JOINs) fallan en el
-- contexto de escritura de PostgREST. La solución es una función SECURITY
-- DEFINER que valida la autorización internamente y ejecuta las operaciones
-- con privilegios elevados — patrón estándar de Supabase para este caso.
--
-- Reemplaza el DELETE+INSERT directo en addonService.upsertProductAddons.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_product_addons(
  p_product_id UUID,
  p_addons     JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorized BOOLEAN;
BEGIN
  -- Verificar que el usuario es dueño o colaborador activo del negocio
  SELECT EXISTS (
    SELECT 1 FROM products p
    JOIN businesses b ON p.business_id = b.id
    JOIN profiles pr   ON b.owner_id = pr.id
    WHERE p.id = p_product_id
      AND pr.user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM products p
    JOIN collaborators c ON p.business_id = c.business_id
    JOIN profiles pr      ON c.user_id = pr.id
    WHERE p.id = p_product_id
      AND pr.user_id = auth.uid()
      AND c.active = true
  ) INTO v_authorized;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'No tienes permiso para modificar los extras de este producto';
  END IF;

  -- Reemplazar addons en una sola transacción
  DELETE FROM product_addons WHERE product_id = p_product_id;

  IF p_addons IS NOT NULL AND jsonb_array_length(p_addons) > 0 THEN
    INSERT INTO product_addons (
      product_id, category_name, name, price, max_quantity, sort_order, active
    )
    SELECT
      p_product_id,
      (a->>'category_name')::TEXT,
      (a->>'name')::TEXT,
      (a->>'price')::NUMERIC,
      (a->>'max_quantity')::INTEGER,
      (a->>'sort_order')::INTEGER,
      COALESCE((a->>'active')::BOOLEAN, true)
    FROM jsonb_array_elements(p_addons) AS a;
  END IF;
END;
$$;

-- FIN DE LA MIGRACIÓN
-- ============================================================================
